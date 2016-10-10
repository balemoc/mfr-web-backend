/*
    Config is same for every environment, just with different variables
 */
const Config = {
  development: {
    db: {
      url: 'mongodb://mor-fit-run:mor-fit-run@bael.me:27017/mor-fit-run?readPreference=primary',
    },
    http: {
      port: '2000',
    },
    email: {
      host: 'mailtrap.io',
      port: 2525,
      auth: {
        user: '78f37267510fd1',
        pass: 'd50584a8070ef0',
      },
    },
    folders: {
      uploads: 'uploads',
      client: 'client',
    },
  },
  production: {
// fulfill
  },
  mixed: {
    security: {
      jwt_key: '1234',
      pt_jwt_options: {
        // https://github.com/auth0/node-jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback
        issuer: 'mfr',
        subject: 'password_token',
        expiresIn: '24 days',
      },
      at_jwt_options: {
        issuer: 'mfr',
        subject: 'access_token',
        expiresIn: '24 days',
      },
    },
  },
};

export default Config;
