const Stripe = require("stripe");
const endpointSecret = ''
// const endpointSecret = 'whsec_0a91c6c2cc2f68a88f21e3b8d0e2bf7df290eb3a1605a83b68bb7124d789617b'

module.exports = {
    async confirmPayment(ctx, next) {
        let  event  = ctx.request.body

        let userData 

        // console.log("here")

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

        if (endpointSecret) {
            // Get the signature sent by Stripe
            const signature = ctx.request.headers['stripe-signature'];
            try {
              event = stripe.webhooks.constructEvent(
                event,
                signature,
                endpointSecret
              );
            } catch (err) {
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
                    return ctx.send({message : "Internal server error"}, 500)
                }
                
                const updatedReservation = await strapi.entityService.update('api::reservation-request.reservation-request',reservationId, {
                    data : {
                        payment_completed : true,
                    }
                })

                
                if(!updatedReservation) {
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
                return
            }

            strapi.plugin('email-designer').service('email').sendTemplatedEmail(
                {
                    to : userData?.email,
                    from : "jithinksatheesh@zohomail.in",
                    replyTo : "jithinksatheesh@zohomail.in" ,
                },
                {
                    templateReferenceId : templateId,
                    subject : "Star world limo Payment Success",
                },
                {
                    userData,
                }
            );
            
        } catch (err) {
            strapi.log.debug('📺: ', err);
        }


    },


}