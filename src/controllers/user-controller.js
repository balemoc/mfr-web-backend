import Chance from 'chance';
import moment from 'moment';
import Path from 'path';
import fs from 'fs';
import _ from 'lodash';
import jwt from 'jsonwebtoken';
import Promise from 'bluebird';
import NodeMailer from 'nodemailer';
import {
  ObjectId,
} from 'mongorito';

import User from '~/models/user-model';
import AccessToken from '~/models/access-token-model';

const UserController = {
  login(request, reply) {
    // set needed variables for flow
    const {
      email, password,
    } = request.payload;
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

  // TODO delete access tokens
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


  edit(request, reply) {
    // init default variables for pipeline work
    const decodedToken = request.auth.credentials;
    const fieldsToEdit = request.payload;

    // check if submitted data contains for password edit
    // then hash
    function checkIfPasswordToEdit(user) {
      return new Promise((resolve, reject) => {
        if (fieldsToEdit.password) {
          User.helpers
            // 0.0000000000001% chance is very much for bcrypt fail
            // we do not care
            .generatePasswordHash(fieldsToEdit.password)
            .then((hash) => {
              // set new password hash
              user.set('password', hash);
              resolve(user);
            })
            .catch((error) => {
              reject({
                code: 0,
                message: error,
              });
            });
        } else {
          // there is no need to hash password
          resolve(user);
        }
      });
    }

    // update user field one by one unless it's password
    function updateFields(user) {
      // update fields and send it
      return new Promise((resolve) => {
        _.forEach(fieldsToEdit, (value, field) => {
          // we already took care of password field
          // so we need to be sure we do not edit again
          if (!(field === 'password')) {
            user.set(field, value);
          }
        });
        resolve(user);
      });
    }

    // save edits on user model
    function saveEdits(user) {
      return new Promise((resolve, reject) => {
        user
          .save()
          .then(() => {
            resolve(user); // send back to successhandler
          })
          .catch((error) => {
            reject({
              code: 3,
              message: error,
            }); // send to errorhandler
          });
      });
    }

    // send back a success
    function successHandler() {
      reply();
    }

    function errorHandler(error) {
      switch (error.code) {
      case 0:
        reply.unauthorized('Invalid token'); // invalid token - points user we do not store
        break;
      default:
        reply.badImplementation(error); // we do not know we do not care - logger will handle
      }
    }

    User
      .findOne({
        _id: decodedToken.user_id,
      })
      .then(checkIfPasswordToEdit) // pw hashing
      .then(updateFields) // remaining fields
      .then(saveEdits) // save them
      .then(successHandler)
      .catch(errorHandler);
  },

  get(request, reply) {
    // init
    const decodedToken = request.auth.credentials;

    User
      .findOne({
        _id: decodedToken.user_id,
      })
      .then((user) => reply(user))
      .catch((error) => reply.badImplementation(error));
  },

  uploadAvatar(request, reply) {
    // init
    const payload = request.payload;
    const config = request.server.app.config;
    const decodedToken = request.auth.credentials;
    const chance = new Chance();

    const uploadAvatar = new Promise((resolve, reject) => {
      // generate name of uploaded avatar
      const randomHash = chance.pickone(chance.shuffle(chance.n(chance.hash, 6)));
      const newFileName = moment().format('GGGG_MM_DD_').toString() + randomHash;
      // set avatar path
      const path = Path.join(__dirname,
        `${config.folders.uploads}/${newFileName}_${payload.avatar.hapi.filename}`);

      const file = fs.createWriteStream(path);

      // set event handler on error
      file.on('error', (error) => reject(error));

      // save
      payload.avatar.pipe(file);
      // set event handler on ending
      payload.avatar.on('end', (error) => {
        if (error) return reject(error);
        // pass filepath
        return resolve(`${newFileName}_${payload.avatar.hapi.filename}`);
      });
    });

    // set uploaded avatar filename on avatar field and remove before one
    function updateAvatarOnUser(filename) {
      return new Promise((resolve, reject) => {
        User
          .findOne({
            _id: decodedToken.user_id,
          })
          // remove
          /*
          .then((user) => {
            fs
              .unlink(Path.join(__dirname,
              `${config.folders.uploads}/${user.get('avatar')}`), (error) => {
                console.log(error);
              });
          })
          */
          .then((user) => {
            user.set('avatar', filename);
            // save
            user.save();
            return resolve();
          })
          .catch((error) => reject(error));
      });
    }

    uploadAvatar
      .then(updateAvatarOnUser)
      .then(() => reply())
      .catch((error) => reply.badImplementation(error));
  },

  getFriends(request, reply) {
    // init
    const decodedToken = request.auth.credentials;

    User
      .populate('friends', User)
      .findOne({
        _id: decodedToken.user_id,
      })
      .then((user) => {
        const userFriends = user.get('friends');

        return reply(userFriends);
      })
      .catch((error) => reply.badImplementation(error));
  },

  addFriend(request, reply) {
    // param
    const decodedToken = request.auth.credentials;
    const payload = request.payload;

    User
      .findOne({
        _id: decodedToken.user_id,
      })
      .then((user) => {
        const friends = user.get('friends');
        // save convert string to objectid
        friends.push(new ObjectId(payload[0]));

        user.set('friends', friends);
        user.save();

        // TODO: check if already user & if submitted id is user

        return reply();
      })
      .catch((error) => reply.badImplementation(error));
  },

  removeFriend(request, reply) {
    // param
    const decodedToken = request.auth.credentials;
    const userId = request.params.userId;

    User
      .findOne({
        _id: decodedToken.user_id,
      })
      .then((user) => {
        const friends = user.get('friends');

        // check if user stored
        const removedFriends = _.remove(friends, (obj) => obj === userId);

        user.set('friends', removedFriends);

        user.save();

        return reply();
      })
      .catch((error) => reply.badImplementation(error));
  },

};

export default UserController;
