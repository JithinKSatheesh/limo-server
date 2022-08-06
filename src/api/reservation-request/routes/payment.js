module.exports = {
    routes: [
      {
        method: 'POST',
        path: '/reservation/confirmPayment',
        handler: 'payment.confirmPayment',
      },
    ]
  }