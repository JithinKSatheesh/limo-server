module.exports = ({ env }) => ({
    // ...
    email: {
        config: {
        provider: 'nodemailer',
          providerOptions: {
            host: env('SMTP_HOST', 'smtp.zoho.com'),
            port: env('SMTP_PORT', 465),
            secure: true,
            auth: {
              user: env('SMTP_USERNAME'),
              pass: env('SMTP_PASSWORD'),
              // user: 'jithinksatheesh@gmail.com',
              // pass: 'M98yyQrDmeEf',
            },
            // ... any custom nodemailer options
          },
          settings: {
            // defaultFrom: 'jithinksatheesh@zohomail.in',
            // defaultReplyTo: 'jithinksatheesh@zohomail.in',
            defaultFrom: env('SMTP_DEFAULT_FROM'),
            defaultReplyTo: env('SMTP_DEFAULT_TO'),
          },
        },
      },
    // ...
  });