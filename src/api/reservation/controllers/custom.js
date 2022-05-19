const Stripe = require("stripe");

module.exports = {
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
    async createOrder(ctx, next) {

        // const { body } = ctx.request
        // const {  amount, id } = body;

        

        // const pluginStore = strapi.store({
        //     environment: strapi.config.environment,
        //     type: "plugin",
        //     name: "strapi-stripe",
        // });

        // const stripeSettings = await pluginStore.get({ key: "stripeSetting" });
        // let stripe;

        // if (stripeSettings.isLiveMode) {
        //     stripe = new Stripe(stripeSettings.stripeLiveSecKey);
        // } else {
        //     stripe = new Stripe(stripeSettings.stripeTestSecKey);
        // }

        // // if (!validateItems(items)) {
        // //     ctx.badRequest({ error: 'Invalid items' });
        // // }

        // const paymentIntent = await stripe.paymentIntents.create({
		// 	amount : 10,
		// 	currency: "USD",
		// 	description: "Spatula company",
        //     // automatic_payment_methods: {
        //     //     enabled: true,
        //     // },
		// 	confirm: true
		// })

        // ctx.response.body = {
        //     clientSecret: paymentIntent.client_secret,
        //     message: "Payment successful",
		// 	success: true
        // }


    },
    async createCheckOut(ctx, next) {

        // *** not in use
        const { body } = ctx.request
        const {  priceId, metadata } = body;

        

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
            redirectURL :  session.url
        }


    },
    async getCheckOutStatus(ctx, next) {

        // *** not in use
        const { body } = ctx.request
        const {  sessionId } = body;

        

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
            data : session 
        }


    },

}