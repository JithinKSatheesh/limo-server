module.exports = ({ env }) => ({
    proxy: true,
    url: env('MY_ADMIN_URL'),
    app: { 
      keys: env.array('APP_KEYS')
    },
  })
 