import User from '~/models/user-model';
import AccessToken from '~/models/access-token-model';
import jwt from 'jsonwebtoken';
import Chance from 'chance';
import moment from 'moment';
import Path from 'path';
import fs from 'fs';
import _ from 'lodash';

const UserController = {
  editUserField(request, reply) {
    // init default variables for pipeline work
    const decodedToken = request.auth.credentials;
    const fieldsToEdit = request.payload;

    // check if users collection contains user and send him back
    function checkUserById(users) {
      return new Promise((resolve, reject) =>
        (users[0] ? resolve(users[0]) : reject({
          code: 0,
        })));
    }

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
          // so we need to sure we do not edit again
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
      .find({
        _id: decodedToken.user_id,
      })
      .then(checkUserById) // check user by id and send him back
      .then(checkIfPasswordToEdit) // pw hashing
      .then(updateFields) // remaining fields
      .then(saveEdits) // save them
      .then(successHandler)
      .catch(errorHandler);
  },

  getUserData(request, reply) {
    const decodedToken = request.auth.credentials;

    User
      .find({
        _id: decodedToken.user_id,
      })
      .then((users) => {
        reply({
          user_id: users[0].get('_id'),
          first_name: users[0].get('first_name'),
          last_name: users[0].get('last_name'),
          email: users[0].get('email'),
          gender: users[0].get('gender'),
          birth_date: users[0].get('birth_date'),
        });
      })
      .catch((error) => {
        reply(error);
      });
  },

  uploadAvatar(request, reply) {
    // uploaded data
    const data = request.payload;
    const config = request.server.app.config;
    const chance = new Chance();
    const fileType = data.avatar.hapi.headers['content-type'];

    // check if submitted is avatar
    if (data.avatar) {

      if (fileType !== 'image/jpeg' || fileType !== 'image/png') {

      }

      // newfile
      const randomHash = chance.pickone(chance.shuffle(chance.n(chance.hash, 6)));
      const newFileName = moment().format('GGGG_MM_DD_').toString() + randomHash;
      // set avatar path
      const path = Path.join(__dirname, `${config.uploads.client}/
        ${config.uploads.folder}/${newFileName}`);

      console.log(data.avatar)

      const file = fs.createWriteStream('dist/client/cent');

      // set event handler on error
      file.on('error', (error) => {
          console.log(error)
      });

      // save
      data.avatar.pipe(file);
      // set event handler on ending
      data.avatar.on('end', (error) => {
        return reply();
      });
    } else {
      reply.unsupportedMediaType('Unsupported upload');
    }
  },
};

export default UserController;
