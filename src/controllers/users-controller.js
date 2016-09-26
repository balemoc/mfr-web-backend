import User from '~/models/user-model';
import AccessToken from '~/models/access-token-model';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import NodeMailer from 'nodemailer';

const UsersController = {
  resetPassword(request, reply) {
    const email = request.payload.email;
    const config = request.server.app.config;

    function checkUserByEmail(users) {
      return new Promise((resolve, reject) =>
        (users[0] ? resolve(users[0]) : reject({
          code: 0,
          message: email,
        })));
    }

    // generate a passwordtoken and save aswell
    function generateAndSavePasswordToken(user) {
      return new Promise((resolve, reject) => {
        // store email in token to make sure token is unique
        const passwordToken = jwt.sign({
          user_id: user.get('_id'),
          email: user.get('email'),
        }, config.mixed.security.jwt_key, config.mixed.security.pt_jwt_options);
        // from environment config

        user.set('password_token', passwordToken);

        user
          .save()
          .then((userWithToken) => resolve(userWithToken))
          .catch((error) => reject({
            code: 1,
            message: error,
          }));
      });
    }

    function sendEmail(user) {
      return new Promise((resolve, reject) => {
        const mailOptions = {
          from: '"Mór Fit Run" <info@morfitrun.com>', // sender address
          to: `${user.get('email')}`, // list of receivers
          subject: `Recover your account, ${user.get('first_name')}!`, // Subject line
          text: `Your password recovery token is: ${user.get('password_token')}`, // plaintext body
        };

        const transport = NodeMailer.createTransport(config.email);

        // send email and if error reject
        transport.sendMail(mailOptions, (error) => {
          if (error) {
            reject({
              error: 2,
              message: error,
            });
          } else {
            resolve();
          }
        });
      });
    }

    // sending back a message
    function successHandler() {
      reply();
    }

    // checking if error's coming from exception or data's side
    function errorHandler(error) {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      default:
        reply.badImplementation(error);
      }
    }

    User
      .find({
        email,
      })
      // send back a single user (array comes from find) and reject if invalid email
      .then(checkUserByEmail)
      .then(generateAndSavePasswordToken) // generate save token
      .then(sendEmail)
      .then(successHandler) // if everything went well
      .catch(errorHandler); // if any error occured
  },

  recoverPassword(request, reply) {
    // new password
    const password = request.payload.password;
    // decoded password token
    const userId = request.auth.credentials.user_id;

    // check user by id
    function checkUserById(users) {
      return new Promise((resolve, reject) =>
        (users[0] ? resolve(users[0]) : reject({
          code: 0,
          message: userId,
        })));
    }

    function setNewPassword(user) {
      return new Promise((resolve, reject) => {
        User.helpers
          .generatePasswordHash(password)
          .then((hash) => {
            // store hashed password
            user.set('password', hash);

            user
              .save()
              .then((userWithHash) => resolve(userWithHash))
              .catch((error) => reject({
                code: 1,
                message: error,
              }));
          })
          .catch((error) => reject({
            code: 1,
            message: error,
          }));
      });
    }

    // remove passwordtoken from user
    function removePasswordToken(user) {
      return new Promise((resolve, reject) => {
        // remove pw token - "used"
        user.set('password_token', '');

        user
          .save()
          .then((userWithoutToken) => resolve(userWithoutToken))
          .catch((error) => reject({
            code: 2,
            message: error,
          }));
      });
    }

    // remove all accesstokens based on userid
    function removeAccessTokens(user) {
      return new Promise((resolve, reject) => {
        // clear accesstokens collection
        AccessToken
          .remove({
            user_id: user.get('_id'),
          })
          .then(() => resolve(user))
          .catch((error) => reject({
            code: 3,
            message: error,
          }));

        // remove from user entity aswell
        user.set('access_tokens', []); // set empty array - collection

        user
          .save()
          .then((userWithoutToken) => resolve(userWithoutToken))
          .catch((error) => reject({
            code: 3,
            message: error,
          }));
      });
    }

    // sending back a message if flow has succeeded
    function successHandler() {
      reply();
    }

    // checking if error's coming from exception or data's side
    function errorHandler(error) {
      switch (error.code) {
      case 0:
        reply.notFound('User is missing');
        break;
      default:
        reply.badImplementation(error);
      }
    }

    User
      .find({
        _id: userId,
      })
      .then(checkUserById)
      .then(setNewPassword) // set new pw
      .then(removePasswordToken) // remove password token
      .then(removeAccessTokens) // remove access tokens
      .then(successHandler) // reply success
      .catch(errorHandler); // fail
  },

  createUser(request, reply) {
    // parsed new user data
    const newUser = request.payload;
    newUser.birth_date = new Date(newUser.birth_date); // convert json date to js date

    function checkUserByEmail(users) {
      return new Promise((resolve, reject) =>
        (_.isEmpty(users) ? resolve() : reject({
          code: 0, // if there is an user registered with this email
          message: users[0], // pass user to errorhandler
        })));
    }

    function createNewUser() {
      return new Promise((resolve, reject) => {
        const user = new User(newUser);
        // create new user with passed variables
        user
          .save()
          .then((createdUser) => resolve(createdUser)) // pass created user
          .catch((error) => reject({
            code: 1,
            message: error,
          }));
      });
    }

    function hashPasswordAndSave(userWithoutHash) {
      return new Promise((resolve, reject) => {
        User.helpers
          // switch user's password with a hashed one
          .generatePasswordHash(userWithoutHash.get('password'))
          .then((hash) => {
            userWithoutHash.set('password', hash);

            userWithoutHash
              .save()
              .then((user) => resolve(user)) // passing hashed user
              .catch((error) => reject({
                code: 2,
                message: error,
              }));
          })
          .catch((error) => reject({
            code: 2,
            message: error,
          }));
      });
    }

    // sending back a 200 http status code
    function successHandler() {
      reply();
    }

    // checking if error's coming from exception or data's side
    function errorHandler(error) {
      switch (error.code) {
      case 0:
        reply.conflict('User is already registered with this email');
        break;
      default:
        // it we do not know or exception & log
        reply.badImplementation(error);
      }
    }

    User
      .find({
        email: newUser.email,
      })
      // check if there is no user registered with such email
      .then(checkUserByEmail) // error code - 0
      .then(createNewUser) // error code - 1 etc
      .then(hashPasswordAndSave) // hash and save pw on model
      .then(successHandler) // if success
      .catch(errorHandler); // if fail
  },

  getUserByID(request, reply) {
    const userID = request.params.id;

    function checkUserByEmail(users) {
      return new Promise((resolve, reject) =>
        (_.isEmpty(users) ? reject({
          code: 0,
          message: userID,
        }) : resolve(users[0]))); // pass user if otherwise userid if absent
    }

    // sending back a message
    function successHandler(user) {
      reply({
        avatar: user.get('avatar') || '', // if not set
        first_name: user.get('first_name'),
        last_name: user.get('last_name'),
        gender: user.get('gender'),
        birth_date: user.get('birth_date'),
      });
    }

    // checking if error's coming from exception or data's side
    function errorHandler(error) {
      // check errorcode
      switch (error.code) {
      case 0:
        reply.notFound('There is no user with this ID');
        break;
      default:
        // log error
        reply.badImplementation(error);
      }
    }

    User
      .find({
        _id: userID,
      })
      // check if there is no user registered with such email
      .then(checkUserByEmail)
      .then(successHandler)
      .catch(errorHandler);
  },
};

export default UsersController;
