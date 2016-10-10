import _ from 'lodash';
import moment from 'moment';

import User from '~/models/user-model';

const UsersController = {
  create(request, reply) {
    // parsed new user data
    const newUser = request.payload;
    newUser.birth_date = moment(newUser.birth_date).toDate(); // convert json date to js date
    newUser.access_tokens = [];
    newUser.password_tokens = '';

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

  getByID(request, reply) {
    const userId = request.params.userId;

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
        _id: userId,
      })
      // check if there is no user registered with such email
      .then(checkUserByEmail)
      .then(successHandler)
      .catch(errorHandler);
  },

  get(request, reply) {
    // filters
    const {
      // age,
      gender,
    } = request.query;
    // query obj
    const query = {};

    // TODO AGE
    // buiilding query obj
    if (gender) query.gender = gender;

    User
      .find(query)
      .then((users) => {
        // strip properties to reply
        const stripedUsers = [];

        _.forEach(users, (obj) => {
          stripedUsers.push({
            user_id: obj.get('_id'),
            first_name: obj.get('first_name'),
            last_name: obj.get('last_name'),
            birth_date: obj.get('birth_date'),
            gender: obj.get('gender'),
            avatar: obj.get('avatar'),
          });
        });

        return reply(stripedUsers);
      })
      .catch((error) => reply(error));
  },
};

export default UsersController;
