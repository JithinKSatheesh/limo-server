const Stripe = require("stripe");

module.exports = {
    async createReservation(ctx, next) {
        const {
            from, to, date, time, name, email, phone, info, strapiStripeId
        } = ctx.request.body

        let newOrderId = await strapi.db.query('api::reservation-request.reservation-request').count()

        newOrderIdString = `${(new Date()).getFullYear().toString().slice(-2)}${newOrderId}${(new Date()).getMonth().toString()}`

        order_number = (`${100000 + parseInt(newOrderId)}`)
       
       const  payment_code = (`${100000 + parseInt(newOrderIdString)}`).slice(-6)

        // console.log(order_number)

        if (!order_number || !payment_code) {
            return ctx.internalServerError('Something went wrong')
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
                strapiStripeId,
                strapi_stripe_product : strapiStripeId,
                order_number,
                payment_code,
            },
            fields : ["order_number"]
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
            payment_code
            
        }

        try {
            
            // console.log(name, email, item_name, item_description, templateId)

            await strapi.plugin('email-designer').service('email').sendTemplatedEmail(
                {
                    to : email,
                    from : "jithinksatheesh@zohomail.in",
                    replyTo : "jithinksatheesh@zohomail.in" ,
                },
                {
                    templateReferenceId : templateId,
                    subject : "Star world limo Payment code",
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

        const entity = await strapi.entityService.findMany('api::reservation-request.reservation-request',{ 
            filters: { payment_code : code },
            populate : ["strapi_stripe_product"]
            
        })

        if (!entity) {
            return ctx.internalServerError('Something went wrong')
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
    async getStrapiStripeProducts(ctx, next) {

        // const entity = await strapi.entityService.findMany('api::strapi-stripe-product.strapi-stripe-product')
        const entity = await strapi.query("plugin::strapi-stripe.strapi-stripe-product").findMany()

        if (!entity) {
            return ctx.internalServerError('Something went wrong')
        }

        ctx.response.body = {
            data : entity
        }

    },  
    async createOrder(ctx, next) {



    },
    async createCheckOut(ctx, next) {

        // *** not in use
        const { body } = ctx.request
        const { priceId, metadata } = body;



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

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            metadata,
            success_url: `${process.env.FRONT_END_URL}/payment/status/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONT_END_URL}/payment/status/fail?session_id={CHECKOUT_SESSION_ID}`,
        });

        // console.log(session)

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

}