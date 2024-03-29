const Stripe = require("stripe");
const unparsed = require("koa-body/unparsed.js");
// const endpointSecret = ''
// const endpointSecret = 'whsec_0a91c6c2cc2f68a88f21e3b8d0e2bf7df290eb3a1605a83b68bb7124d789617b'

module.exports = {
    async confirmPayment(ctx, next) {
        let  event = ctx.request.body;
        let endpointSecret =  ''
        let userData 

        // console.log("here")

        const pluginStore = strapi.store({
            environment: strapi.config.environment,
            type: "plugin",
            name: "strapi-stripe",
        });

        const configs = await strapi.entityService.findMany('api::config.config');

        const stripeSettings = await pluginStore.get({ key: "stripeSetting" });
        let stripe;
        

        if (stripeSettings.isLiveMode) {

            stripe = new Stripe(stripeSettings.stripeLiveSecKey);
            endpointSecret = process.env.STRIPE_WEEKHOOK_SECRET

        } else {

            stripe = new Stripe(stripeSettings.stripeTestSecKey);
            endpointSecret = process.env.STRIPE_WEEKHOOK_SECRET_TEST
        }

        if (configs?.stripe_webhook_validation && endpointSecret) {
            // Get the signature sent by Stripe
            const signature = ctx.request.headers['stripe-signature'];
            const payload = ctx.request.body[unparsed]

            console.log(signature, payload, endpointSecret)

            try {
              event = stripe.webhooks.constructEvent(
                payload,
                signature,
                endpointSecret
              );
            } catch (err) {
                console.log(err)
                console.log(`⚠️  Webhook signature verification failed.`, err.message);
                return ctx.send({},400);
            }
          }

        // strapi.log.debug('📺: called');
        // console.log(event)

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                const metadata = event?.data?.object?.metadata;
                const amount_total = event?.data?.object?.amount_total
                // console.log(event?.data);
                const {payment_code, reservationId, order_number = ''} = metadata

                
                if(!payment_code|| !reservationId) {
                    console.log("No payment code or reservation code")
                    return ctx.send({message : "Internal server error"}, 500)
                }
                
                const updatedReservation = await strapi.entityService.update('api::reservation-request.reservation-request',reservationId, {
                    data : {
                        payment_completed : true,
                    },
                    populate : ["car"]
                })

                
                if(!updatedReservation) {
                    console.log("No updated reservation")
                    return ctx.send({message : "Internal server error"}, 500)
                }
                
                try {

                    const paymentActivity = await strapi.entityService.create('api::payment-activity.payment-activity', {
                        data : {
                            stripe_checkout_session_id : event?.data?.object?.id,
                            stripe_payment_intent : event?.data?.object?.payment_intent,
                            amount_paid : `${(parseFloat(amount_total)/100)}`,
                            ...metadata,
                            reservation_request : metadata?.reservationId,
                        }
                    })
                    
                    // console.log(paymentActivity)
                    
                    if(!paymentActivity) {
                        console.log("No paymentActivity")
                        return ctx.send({message : "Internal server error"}, 500)
                    }
                } catch(ex) {
                    console.log(ex)
                }

                userData = updatedReservation
                
                // Then define and call a method to handle the successful payment intent.
                // handlePaymentIntentSucceeded(paymentIntent);
                break;
            default:
                // Unexpected event type
                console.log(`Unhandled event type ${event.type}.`);
        }

        ctx.send({
            message: 'Payment recieved'
        }, 200);

        // -------------------------
        // Sending email
        // -------------------------
       

        const templateId = "2"

        try {

            // console.log(name, email, item_name, item_description, templateId)
            if(!userData?.email) {
                console.log("No user found")
                return
            }

            let mailList = (configs?.notification_email && configs?.forward_payment_reciept) ?  [userData?.email, configs?.notification_email]  : [userData?.email]

            strapi.plugin('email-designer').service('email').sendTemplatedEmail(
                {
                    to : mailList,
                    from: process.env.SMTP_DEFAULT_FROM,
                    replyTo: process.env.SMTP_DEFAULT_TO,
                },
                {
                    templateReferenceId : templateId,
                    subject : "Car booking successful!",
                },
                {
                    userData,
                }
            );
            
        } catch (err) {
            console.log(err, "Couldn't sent mail")
            strapi.log.debug('📺: ', err);
        }


    },


}