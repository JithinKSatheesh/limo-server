module.exports = {
    routes: [
      {
        method: 'GET',
        path: '/reservation/getProducts',
        handler: 'custom.getProducts',
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
      
    ]
  }