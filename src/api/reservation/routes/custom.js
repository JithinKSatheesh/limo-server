module.exports = {
    routes: [
      {
        method: 'GET',
        path: '/reservation/getProducts',
        handler: 'custom.getProducts',
      },
      {
        method: 'GET',
        path: '/reservation/getStrapiStripeProducts',
        handler: 'custom.getStrapiStripeProducts',
      },
      {
        method: 'POST',
        path: '/reservation/createOrder',
        handler: 'custom.createOrder',
      },
      {
        method: 'POST',
        path: '/reservation/createCheckOut',
        handler: 'custom.createCheckOut',
      },
      {
        method: 'POST',
        path: '/reservation/getCheckOutStatus',
        handler: 'custom.getCheckOutStatus',
      },
      {
        method: 'POST',
        path: '/reservation/createReservation',
        handler: 'custom.createReservation',
      },
      {
        method: 'POST',
        path: '/reservation/getReservation',
        handler: 'custom.getReservation',
      },
      
    ]
  }