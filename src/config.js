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
    facebook: {
      appId: '1012799602130499',
      appSecret: 'f8a7f084be59eaef547172963f75297e',
      redirectUri: 'http://localhost:8080/facebook',
    },
    security: {
      jwtKey: '1234',
      // https://github.com/auth0/node-jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback
      jwtOptions: {
        issuer: 'mfr',
        subject: 'access_token',
        expiresIn: '24 days',
      },
    },
  },
};

export default Config;
