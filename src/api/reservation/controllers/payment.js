const Stripe = require("stripe");
const endpointSecret = ''

module.exports = {
    async confirmPayment(ctx, next) {
        let  event  = ctx.request.body

        let userData 


        if (endpointSecret) {
            // Get the signature sent by Stripe
            const signature = request.headers['stripe-signature'];
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
                // console.log(userData);
                const {payment_code, reservationId, order_number = ''} = metadata

                userData = metadata

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