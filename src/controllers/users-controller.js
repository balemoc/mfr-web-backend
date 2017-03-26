import _ from 'lodash';
import moment from 'moment';

import User from '~/models/user-model';

const UsersController = {
  create(request, reply) {
    // get params
    const {
      firstName,
      lastName,
      email,
      password,
      birthDate: _birthDate,
      gender,
    } = request.payload;

    const birthDate = moment(_birthDate).toDate(); // convert to json date
    // initialize empty fields
    const passwordToken = '';
    const accessTokens = [];
    const avatar = '';
    const friends = [];
    const lastActivity = moment().toDate();
    const social = {};
    const favourited = '';
    const follows = [];
    const joined =  [];
    const created = [];
    const earned = [];

    const checkUser = (user) => {
      if (user) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve();
    };

    const createUser = () => {
      const user = new User({
        firstName,
        lastName,
        email,
        password,
        birthDate,
        gender,
        // init
        passwordToken,
        accessTokens,
        avatar,
        friends,
        lastActivity,
        social,
        favourited,
        follows,
        joined,
        created,
        earned,
      });
      return user.save();
    };

    const hashPassword = user => User
      .helpers.generatePasswordHash(user.get('password'))
      .then((hash) => {
        // set hash on field
        user.set('password', hash);
        return user.save();
      });

    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.conflict();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    User
      .findOne({
        email,
      })
      .then(checkUser)
      .then(createUser)
      .then(hashPassword)
      .then(successHandler)
      .catch(errorHandler);
  },

  getById(request, reply) {
    // params
    const {
      id,
    } = request.params;

    const checkUser = (user) => {
      if (!user) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(user);
    };

    const successHandler = user => reply(user);

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    const excludedProps = ['created_at', 'updated_at',
      'accessTokens', 'password', 'passwordToken', 'social', 'email'];

    User
      .exclude(excludedProps)
      .findById(id)
      .then(checkUser)
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
    if (gender) query.gender = gender;

    const successHandler = users => reply(users);

    const errorHandler = (error) => {
      switch (error.code) {
      default:
        reply.badImplementation(error);
      }
    };

    const excludedProps = ['created_at', 'updated_at',
      'accessTokens', 'password', 'passwordToken', 'social', 'email'];

    User
      .exclude(excludedProps)
      .find()
      .then(successHandler)
      .catch(errorHandler);
  },
};

export default UsersController;
