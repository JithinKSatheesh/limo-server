const Stripe = require("stripe");

module.exports = {
    async createReservation(ctx, next) {
        const {
            from, to, date, time, name, email, phone, info, car
        } = ctx.request.body

        const configs = await strapi.entityService.findMany('api::config.config')

        // console.log(configs)
        if(!configs?.allow_booking){
            return ctx.internalServerError('booking blocked by admin!')
        }

        const stripe_service_index = 0;

        let newOrderId = await strapi.db.query('api::reservation-request.reservation-request').count()

        newOrderIdString = `${(new Date()).getFullYear().toString().slice(-2)}${newOrderId}${(new Date()).getMonth().toString()}`

        order_number = (`${100000 + parseInt(newOrderId)}`)

        const payment_code = (`${100000 + parseInt(newOrderIdString)}`).slice(-6)

        // console.log(order_number)

        if (!order_number || !payment_code) {
            return ctx.internalServerError('Something went wrong')
        }

        // get a stripe service id
        const strapi_stripe_product = await strapi.query("plugin::strapi-stripe.strapi-stripe-product").findMany()

        if(!strapi_stripe_product?.[stripe_service_index]?.id) {
            return ctx.internalServerError('Stripe service not found')
        }

        const entity = await strapi.entityService.create('api::reservation-request.reservation-request', {
            // fields: [],
            data: {
                pickup: from,
                destination: to,
                date,
                time,
                name,
                email,
                phone,
                info,
                car,
                strapi_stripe_product: strapi_stripe_product?.[stripe_service_index]?.id,
                order_number,
                payment_code,
            },
            fields: ["order_number", "pickup", "destination", "date", "time", "name", "phone", "payment_code"],
            populate : ["car"]
        })

        if (!entity) {
            return ctx.internalServerError('Something went wrong')
        }

        ctx.response.body = { data: entity };

        // -------------------------
        // Sending email
        // -------------------------

        const templateId = "1",
            // If provided here will override the template's subject. Can include variables like "Welcome to {{= project_name }}"
            userData = {
                name,
                email,
                entity,
                payment_code

            }

        // console.log(userData)

        try {

            // console.log(name, email, item_name, item_description, templateId)
            let mailList = (configs?.notification_email && configs?.forward_reservation_reciept) ?  [email, configs?.notification_email]  : [email]
            

            await strapi.plugin('email-designer').service('email').sendTemplatedEmail(
                {
                    to: mailList,
                    from: "jithinksatheesh@zohomail.in",
                    replyTo: "jithinksatheesh@zohomail.in",
                },
                {
                    templateReferenceId: templateId,
                    subject: "Car reservation request recieved.",
                },
                {
                    userData,
                }
            );

        } catch (err) {
            strapi.log.debug('📺: ', err);
        }



    },
    async getReservation(ctx, next) {

        const {
            code
        } = ctx.request.body

        const entity = await strapi.entityService.findMany('api::reservation-request.reservation-request', {
            filters: { payment_code: code },
            sort : { id: 'desc' },
            populate: ["car"],
            fields: ["order_number", "pickup", "destination", "date", "time", "name", "phone", "payment_code", "quotePrice" ],

        })

        // console.log(entity)

        if (!entity?.[0]) {
            return ctx.internalServerError('Invalid payment code!')
        }

        if (!entity?.[0]?.quotePrice) {
            return ctx.internalServerError('You can complete payment only after we confirm the booking!')
        }

        if (entity?.[0]?.payment_completed) {
            return ctx.internalServerError('Payment already completed!')
        }

        ctx.response.body = { data: entity?.[0] };

    },
    async getProducts(ctx, next) {

        const pluginStore = strapi.store({
            environment: strapi.config.environment,
            type: "plugin",
            name: "strapi-stripe",
        });

        const stripeSettings = await pluginStore.get({ key: "stripeSetting" });
        let stripe;

        if (stripeSettings.isLiveMode) {
            stripe = new Stripe(stripeSettings.stripeLiveSecKey);
        } else {
            stripe = new Stripe(stripeSettings.stripeTestSecKey);
        }

        const data = await stripe.products.list()



        ctx.response.body = {
            data
        }

    },

    async createCheckOut(ctx, next) {

        // ***  in use
        const { body } = ctx.request
        const {  metadata } = body;

        // console.log(metadata, "%%%Metadata")


        const pluginStore = strapi.store({
            environment: strapi.config.environment,
            type: "plugin",
            name: "strapi-stripe",
        });

        const stripeSettings = await pluginStore.get({ key: "stripeSetting" });
        let stripe;

        if (stripeSettings.isLiveMode) {
            stripe = new Stripe(stripeSettings.stripeLiveSecKey);
        } else {
            stripe = new Stripe(stripeSettings.stripeTestSecKey);
        }

        if (!metadata ) {
            return ctx.badRequest('Metadata  cannot be empty')
        }

        // **** validation of reservation ******
        // **** check for application_No also in future ****
        const reservationData = await strapi.entityService.findMany('api::reservation-request.reservation-request', {
            filters: { payment_code: metadata?.payment_code },
            sort : { id: 'desc' },
            populate: ["strapi_stripe_product"]
        })



        if (!reservationData?.[0]) {
            return ctx.internalServerError('Verification failed')
        }

        // ----------------------------------------
        // If payment already completd
        // ----------------------------------------
        if (reservationData?.[0]?.payment_completed) {
            return ctx.internalServerError('payment already completed')
        }


        const _quotePrice = reservationData?.[0]?.quotePrice
        const _productId = reservationData?.[0]?.strapi_stripe_product?.stripeProductId

        console.log(_quotePrice, _productId)

        if (!parseFloat(_quotePrice) || !_productId) {
            return ctx.internalServerError('Price not confirmed')
        }


        const _metadata = {
            ...metadata,
            reservationId: reservationData?.[0]?.id
        }

        // -----------------------------------------
        let session;
        // -----------------------------------------

        // checking checkout session id is present
        // ----------------------------------------
        if (reservationData?.[0]?.checkout_session) {
            const _session_id = reservationData?.[0]?.checkout_session
            try{

                session = await stripe.checkout.sessions.retrieve(_session_id);
            } catch(ex){
                return ctx.internalServerError('Stripe payment session error!')
            }
        }

        
        if (session?.status === "complete") {
            return ctx.internalServerError('your payment already completed but  not processed yet!. If not processed with in 24 hours please contact us!')
        }
        
        console.log(session, "from session")

        // if checkout session null or expired
        // ----------------------------------------

        if (!session?.url || session?.status === "expired" || `${session?.amount_subtotal/100}` !== reservationData?.[0]?.quotePrice) {
            try {

                // Generating price
                // ----------------------------------------
                const price = await stripe.prices.create({
                    product: _productId,
                    unit_amount: (parseFloat(_quotePrice) * 100),
                    currency: 'usd',
                });

                // Creating new session
                // ----------------------------------------

                session = await stripe.checkout.sessions.create({
                    line_items: [
                        {
                            // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                            price: price.id,
                            quantity: 1,
                        },
                    ],
                    mode: 'payment',
                    billing_address_collection: 'auto',
                    metadata: _metadata,
                    success_url: `${process.env.FRONT_END_URL}/payment/status/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.FRONT_END_URL}/payment/status/fail?session_id={CHECKOUT_SESSION_ID}`,
                });

            } catch (ex) {
                console.log(ex)
                return ctx.internalServerError("Failed to connect to stripe");
            }


        }

        // console.log(session)
        // Update reservation data
        strapi.entityService.update('api::reservation-request.reservation-request', reservationData?.[0]?.id,{
            data : {
                checkout_session : session?.id,
            }
        })


        ctx.response.body = {
            // clientSecret: paymentIntent.client_secret,
            redirectURL: session.url
        }


    },
    async getCheckOutStatus(ctx, next) {

        // *** not in use
        const { body } = ctx.request
        const { sessionId } = body;



        const pluginStore = strapi.store({
            environment: strapi.config.environment,
            type: "plugin",
            name: "strapi-stripe",
        });

        const stripeSettings = await pluginStore.get({ key: "stripeSetting" });
        let stripe;

        if (stripeSettings.isLiveMode) {
            stripe = new Stripe(stripeSettings.stripeLiveSecKey);
        } else {
            stripe = new Stripe(stripeSettings.stripeTestSecKey);
        }


        const session = await stripe.checkout.sessions.retrieve(sessionId);



        ctx.response.body = {
            // clientSecret: paymentIntent.client_secret,
            data: session
        }


    },
    async getStrapiStripeProducts(ctx, next) {

        // const entity = await strapi.entityService.findMany('api::strapi-stripe-product.strapi-stripe-product')
        const entity = await strapi.query("plugin::strapi-stripe.strapi-stripe-product").findMany()

        if (!entity) {
            return ctx.internalServerError('Something went wrong')
        }

        ctx.response.body = {
            data: entity
        }

    },
    async createOrder(ctx, next) {



    },

}