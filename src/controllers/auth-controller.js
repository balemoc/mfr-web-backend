import User from '~/models/user-model';
import AccessToken from '~/models/access-token-model';
import jwt from 'jsonwebtoken';
// import _ from 'lodash';

const AuthController = {
  login(request, reply) {
    // set needed variables for flow
    const email = request.payload.email;
    const password = request.payload.password;
    const config = request.server.app.config;

    // check if user is registered with email & send him back
    function checkUserByEmail(users) {
      return new Promise((resolve, reject) =>
        (users[0] ? resolve(users[0]) : reject({
          code: 0,
          message: email,
        })));
    }

    // compare incoming password and reject if not equals
    function checkPassword(user) {
      return new Promise((resolve, reject) => {
        User.helpers
          // technically if bcrypt would fail then we would send back bad pw
          // 0.0000000001% chance is very much for that
          // we do not care
          .comparePasswords(password, user.get('password'))
          .then(() => {
            resolve(user);
          })
          .catch((error) => {
            reject({
              code: 1,
              message: error,
            });
          });
      });
    }

    // generate accesstoken with userdetails and save on both user & accesstoken collections
    function generateAccessToken(user) {
      return new Promise((resolve, reject) => {
        // jwt might fail when config is undefined yet i didn't set up a reject for it
        // because then the server would fail to start
        const accessToken = jwt.sign({
          user_id: user.get('_id'),
          email: user.get('email'),
        }, config.mixed.security.jwt_key, config.mixed.security.at_jwt_options);

        // store user details in token
        const token = new AccessToken({
          user_id: user.get('_id'),
          type: 'web',
          token: accessToken,
        });

        // save
        token
          .save()
          .then((newToken) => {
            // initially is undefined - that's why we need init with array
            const tokens = user.get('access_tokens') || [];

            // TODO: remove same type of accesstokens

            // get all tokens as array
            // and after pushing new, save back
            // hacky due to mongorito does not support modelbased push operations
            tokens.push(newToken.get('_id'));
            // save on user
            user.set('access_tokens', tokens);

            user
              .save()
              .then(() => resolve(token)) // pass token for reply
              .catch((error) => reject({
                code: 2,
                data: error,
              }));
          });
      });
    }

    // sending back a message if flow has succeeded
    function successHandler(token) {
      reply({
        access_token: token.get('token'),
      });
    }

    // every code references to a point in auth flow - look at next section below
    function errorHandler(error) {
      switch (error.code) {
      case 0: // there is no user with such email
        reply.notFound('Email is not registered');
        break;
      case 1:
        reply.unauthorized('Wrong credentials');
        break;
      default:
        // it we do not know or exception & log
        // we do not check db errors
        reply.badImplementation(error);
      }
    }

    User
      .find({
        email,
      })
      // get single user - case 0
      .then(checkUserByEmail)
      // check pw - case 1
      .then(checkPassword)
      // save tokens - case 2
      .then(generateAccessToken)
      // reply with token
      .then(successHandler)
      // check errorcode and reply with error
      .catch(errorHandler);
  },

};

export default AuthController;
