import Chance from 'chance';
import moment from 'moment';
import Path from 'path';
import fs from 'fs';
import _ from 'lodash';
import jwt from 'jsonwebtoken';
import Promise from 'bluebird';
import NodeMailer from 'nodemailer';
import Axios from 'axios';
import {
  ObjectId,
} from 'mongorito';

import User from '~/models/user-model';
import Race from '~/models/race-model';
import AccessToken from '~/models/access-token-model';

const UserController = {
  login(request, reply) {
    // params
    const {
      email,
      password,
    } = request.payload;

    // check if user found
    const checkUser = (user) => {
      if (!user) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(user);
    };

    // compare passwords
    const checkPassword = user =>
      User.helpers
        .comparePasswords(password, user.get('password'))
        .then(() => user) // match
        .catch(() => Promise.reject({ // !match
          code: 1,
        }));

    // cleaning purpose TODO
    const checkIssuedTokens = (user) => {
      return AccessToken
        .find({
          type: 'web',
        });
    };

    const generateToken = (user) => {
      // jwt might fail when config is undefined yet i didn't set up a reject for it
      // because then the server would fail to start
      const {
        jwtKey,
        jwtOptions,
      } = request.server.app.config.mixed.security;

      const accessToken = jwt.sign({
        userId: new ObjectId(user.get('_id')),
        email: user.get('email'),
      }, jwtKey, jwtOptions);

      // store user details in token
      const token = new AccessToken({
        userId: new ObjectId(user.get('_id')),
        type: 'web',
        raw: accessToken,
      });

      return token.save()
        .then(() => [token, user]);
    };

    const saveTokenOnUser = (arr) => {
      const token = arr[0];
      const user = arr[1];

      const tokens = user.get('accessTokens');

      // TODO: remove same type of accesstokens

      // get all tokens as array
      // and after pushing new, save back
      // hacky due to mongorito does not support modelbased push operations
      tokens.push(token.get('_id'));
      // save on user
      user.set('accessTokens', tokens);

      return user.save()
        .then(() => token.get('raw'));
    };

    const successHandler = accessToken => reply({
      accessToken,
    });

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      case 1:
        reply.unauthorized();
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
      .then(checkPassword)
      .then(generateToken)
      .then(saveTokenOnUser)
      .then(successHandler)
      .catch(errorHandler);
  },

  loginFacebook(request, reply) {
    const {
      code,
    } = request.payload;
    const {
      facebook,
    } = request.server.app.config.mixed;

    // trade explicit granted (see oauth 2 spec) code with accesstoken
    // & refreshtoken
    const graphUrl = 'https://graph.facebook.com/v2.8';
    const oauthUrl = 'https://graph.facebook.com/v2.8/oauth/access_token';
    // const debugUrl = 'https://graph.facebook.com/v2.8/debug_token';

    // get user accesstoken
    const getUserAccessToken = () =>
      Axios.get(oauthUrl, {
        params: {
          client_id: facebook.appId,
          redirect_uri: facebook.redirectUri,
          client_secret: facebook.appSecret,
          code,
        },
      })
      .then(response => response.data.access_token);

    // get app accesstoken
    /*
    const getAppAccessToken = () =>
      Axios.get(oauthUrl, {
        params: {
          client_id: facebook.appId,
          client_secret: facebook.appSecret,
          grant_type: 'client_credentials',
        },
      })
      .then(response => response.data);
    */

    // check for validation of useraccesstoken
    /*
    const getUserAccessTokenInfo = (tokens) => {
      const userAccessToken = tokens[0].access_token;
      const appAccessToken = tokens[1].access_token;

      return Axios.get(debugUrl, {
        params: {
          input_token: userAccessToken,
          access_token: appAccessToken,
        },
      })
      .then(response => [userAccessToken, appAccessToken, response.data.data]); // data.data
    };
    */

    const createOrUpdateUser = (accesstoken) => {
      // get user data from facebook
      const getUserDataFromFacebook = () =>
        Axios.get(`${graphUrl}/me`, {
          params: {
            access_token: accesstoken,
            fields: 'birthday,email,first_name,last_name,gender,picture{url}',
          },
        })
        // send back fbuser & token
        .then(response => [response.data, accesstoken]);

      // get user data from db
      const getUserDataFromDb = (args) => {
        const fbUser = args[0];
        const token = args[1];

        return User
          .or({
            'social.facebook.userId': fbUser.id,
          }, {
            email: fbUser.email,
          })
          .findOne()
          .then((user) => {
            // check for match
            // match - store new token / data
            if (user) {
              // set new token
              user.set('social.facebook.userId', fbUser.id);
              user.set('social.facebook.accessToken', token);

              return user.save();
            }
            // store new user account
            // TODO: move to model hooks
            const newUser = new User({
              firstName: fbUser.first_name,
              lastName: fbUser.last_name,
              email: fbUser.email,
              gender: fbUser.gender,
              avatar: fbUser.picture.data.url,
              birthDate: new Date(fbUser.birthday), // fb
              password: '',
              // init
              passwordToken: '',
              accessTokens: [],
              friends: [],
              lastActivity: [],
              social: {
                facebook: {
                  userId: fbUser.id,
                  accessToken: token, // store token for late using,
                },
              },
              favourited: '',
              followed: [],
              joined: [],
              created: [],
              earned: [],
            });

            return newUser.save();
          });
      };

      return getUserDataFromFacebook()
        .then(getUserDataFromDb);
    };

    const generateToken = (user) => {
      const {
        jwtKey,
        jwtOptions,
      } = request.server.app.config.mixed.security;
      // jwt might fail when config is undefined yet i didn't set up a reject for it
      // because then the server would fail to start
      const accessToken = jwt.sign({
        userId: user.get('_id'),
        email: user.get('email'),
      }, jwtKey, jwtOptions);

      // store user details in token
      const token = new AccessToken({
        userId: user.get('_id'),
        type: 'web',
        raw: accessToken,
      });

      return token.save()
        .then(() => [token, user]);
    };

    const saveTokenOnUser = (arr) => {
      const token = arr[0];
      const user = arr[1];

      const tokens = user.get('accessTokens');

      // TODO: remove same type of accesstokens

      // get all tokens as array
      // and after pushing new, save back
      // hacky due to mongorito does not support modelbased push operations
      tokens.push(token.get('_id'));
      // save on user
      user.set('accessTokens', tokens);

      return user.save()
        .then(() => token.get('raw'));
    };

    const successHandler = accessToken => reply({
      accessToken,
    });

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.unauthorized();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    getUserAccessToken()
      .then(createOrUpdateUser)
      .then(generateToken)
      .then(saveTokenOnUser)
      .then(successHandler)
      .catch(errorHandler);
  },

  resetPassword(request, reply) {
    const email = request.payload.email;
    const {
      config,
    } = request.server.app;

    const checkUser = (user) => {
      if (!user) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(user);
    };

    const generatePasswordToken = (user) => {
      const chance = new Chance();
      // TODO unique hash quarantee
      const passwordToken = chance.hash();

      user.set('passwordToken', passwordToken);

      return user.save();
    };

    const sendEmail = (user) => {
      const mailOptions = {
        from: '"Mór Fit Run" <info@morfitrun.com>', // sender address
        to: `${user.get('email')}`, // list of receiver
        subject: `Recover your account, ${user.get('firstName')}!`, // Subject line
        text: `Your password recovery token is: ${user.get('passwordToken')}`, // plaintext body
      };

      const transport = NodeMailer.createTransport(config.email);

      return new Promise((resolve, reject) => {
        transport.sendMail(mailOptions, (error) => {
          if (error) {
            return reject();
          }
          return resolve();
        });
      });
    };

    // sending back a message
    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
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
      .then(generatePasswordToken)
      .then(sendEmail)
      .then(successHandler) // if everything went well
      .catch(errorHandler); // if any error occured
  },

  recoverPassword(request, reply) {
    // parameters
    const {
      password,
      passwordToken,
    } = request.payload;

    // check if found user
    const checkUser = (user) => {
      if (!user) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(user);
    };

    const generatePasswordHash = user =>
      User.helpers
        .generatePasswordHash(password)
        .then(hash => [hash, user]);

    const saveHash = (arr) => {
      const hash = arr[0];
      const user = arr[1];

      user.set('password', hash);
      user.set('passwordToken', '');

      return user.save();
    };

    const removeAccessTokens = (user) => {
      const fromAT = () =>
        AccessToken
          .remove({
            userId: user.get('_id'),
          });

      const fromUser = () => {
        user.set('accessTokens', []);

        return user.save();
      };

      return Promise.all([fromAT, fromUser]);
    };

    // sending back a message if flow has succeeded
    const successHandler = () => reply();

    // checking if error's coming from exception or data's side
    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    User
      .findOne({
        passwordToken,
      })
      .then(checkUser)
      .then(generatePasswordHash) // set new pw
      .then(saveHash) // remove password token
      .then(removeAccessTokens) // remove access tokens
      .then(successHandler) // reply success
      .catch(errorHandler); // fail
  },

  edit(request, reply) {
    // init default variables for pipeline work
    const {
      userId,
    } = request.auth.credentials;
    const {
      password,
    } = request.payload;

    const hashPassword = (user) => {
      if (password) {
        return User
          .helpers
          .generatePasswordHash(password)
          .then((hash) => {
            user.set('password', hash);
            // set pw
            return user;
          });
      }
      return user;
    };

    const updateFields = user => new Promise((resolve) => {
      _.forEach(request.payload, (value, field) => {
        // we already took care of password field
        // so we need to be sure we do not edit again
        if (!(field === 'password')) {
          user.set(field, value);
        }
      });
      resolve(user);
    });

    const save = user => user.save();

    // send back a success
    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      default:
        reply.badImplementation(error);
      }
    };

    User
      .findOne({
        _id: userId,
      })
      .then(hashPassword) // pw hashing
      .then(updateFields) // remaining fields
      .then(save) // save them
      .then(successHandler)
      .catch(errorHandler);
  },

  get(request, reply) {
    // init
    const {
      userId: _id,
    } = request.auth.credentials;

    const checkUser = (user) => {
      if (!user) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(user);
    };

    const successhandler = user => reply(user);

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
      'accessTokens', 'password', 'passwordToken', 'social'];

    User
      .exclude(excludedProps)
      .findOne({
        _id,
      })
      .then(checkUser)
      .then(successhandler)
      .catch(errorHandler);
  },

  followRace(request, reply) {
    const {
      userId: _userId,
    } = request.auth.credentials;

    const {
      raceId: _raceId,
    } = request.payload;

    const userId = new ObjectId(_userId);
    const raceId = new ObjectId(_raceId);

    const getUserAndRace = () =>
      Promise.all([User.findOne({
        _id: userId,
      }), Race.findOne({
        _id: raceId,
      })]);

    const checkRace = ([user, race]) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve([user, race]);
    };

    const followRace = ([user, race]) => {
      const followedRaces = user.get('followed');
      const followersOfRace = race.get('followedBy');

      // lodash find fails with empty array
      if (!_.isEmpty(followedRaces) || !_.isEmpty(followersOfRace)) {
        // search for userid, raceid in both collection
        const checkRaceWithUser = _.find(followedRaces, raceid => raceid.equals(raceId));
        const checkUserWithRace = _.find(followersOfRace, userid => userid.equals(userId));

        // already follows
        if (checkRaceWithUser || checkUserWithRace) {
          return Promise.reject({
            code: 1,
          });
        }
      }

      // add followed race to user
      followedRaces.push(raceId);
      user.set('followed', followedRaces);
      // add to followers to race
      followersOfRace.push(userId);
      race.set('followedBy', followersOfRace);

      return Promise.all([user.save(), race.save()]);
    };

    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        // race not found
        reply.notFound();
        break;
      case 1:
        // already followed
        reply.conflict();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    getUserAndRace()
      .then(checkRace)
      .then(followRace)
      .then(successHandler)
      .catch(errorHandler);
  },

  unfollowRace(request, reply) {
    const {
      userId: _userId,
    } = request.auth.credentials;

    const {
      raceId: _raceId,
    } = request.payload;

    const raceId = new ObjectId(_raceId);
    const userId = new ObjectId(_userId);

    // get user & race obj
    const getUserAndRace = () =>
      Promise.all([User.findOne({
        _id: userId,
      }), Race.findOne({
        _id: raceId,
      })]);

    const checkRace = ([user, race]) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve([user, race]);
    };

    const unfollow = ([user, race]) => {
      // followed races from user & followers from race
      const followedRaces = user.get('followed');
      const followersOfRace = race.get('followedBy');

      // equal check fails if empty so check
      if (!_.isEmpty(followedRaces) || !_.isEmpty(followersOfRace)) {
        // remove objectids (raceid, userid)
        _.remove(followedRaces, raceid => raceid.equals(raceId));
        _.remove(followersOfRace, userid => userid.equals(userId));
      }

      user.set('followed', followedRaces);
      race.set('followedBy', followersOfRace);

      return Promise
        .all([race.save(), user.save()]);
    };

    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    getUserAndRace()
      .then(checkRace)
      .then(unfollow)
      .then(successHandler)
      .catch(errorHandler);
  },

  favouriteRace(request, reply) {
    const {
      userId: _userId,
    } = request.auth.credentials;

    const {
      raceId: _raceId,
    } = request.payload;

    const userId = new ObjectId(_userId);
    const raceId = new ObjectId(_raceId);

    const getUserAndRace = () =>
      Promise.all([User.findOne({
        _id: userId,
      }), Race.findOne({
        _id: raceId,
      })]);

    const checkRace = ([user, race]) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve([user, race]);
    };

    const favourite = ([user, race]) => {
      const usersFavourited = race.get('favouritedBy');

      // TODO check not remove
      if (!_.isEmpty(usersFavourited)) {
        _.remove(usersFavourited, userid => userid.equals(userId));
      }

      user.set('favourited', raceId);

      usersFavourited.push(userId);
      race.set('favouritedBy', usersFavourited);

      return Promise.all([user.save(), race.save()]);
    };

    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        // race not found
        reply.notFound();
        break;
      case 1:
        // already followed
        reply.conflict();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    getUserAndRace()
      .then(checkRace)
      .then(favourite)
      .then(successHandler)
      .catch(errorHandler);
  },

  unfavouriteRace(request, reply) {
    const {
      userId: _userId,
    } = request.auth.credentials;

    const {
      raceId: _raceId,
    } = request.payload;

    const raceId = new ObjectId(_raceId);
    const userId = new ObjectId(_userId);

    // get user & race obj
    const getUserAndRace = () =>
      Promise.all([User.findOne({
        _id: userId,
      }), Race.findOne({
        _id: raceId,
      })]);

    const checkRace = ([user, race]) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve([user, race]);
    };

    const unFavourite = ([user, race]) => {
      const usersFavourited = race.get('favouritedBy');

      // TODO check not remove
      if (!_.isEmpty(usersFavourited)) {
        _.remove(usersFavourited, userid => userid.equals(userId));
      }

      user.set('favourited', '');
      race.set('favouritedBy', usersFavourited);

      return Promise.all([race.save(), user.save()]);
    };

    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    getUserAndRace()
      .then(checkRace)
      .then(unFavourite)
      .then(successHandler)
      .catch(errorHandler);
  },

  uploadAvatar(request, reply) {
    // init
    const payload = request.payload;
    const config = request.server.app.config;
    const {
      userId: _id,
    } = request.auth.credentials;

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
      file.on('error', error => reject(error));

      // piping stream
      payload.avatar.pipe(file);
      // set event handler on ending
      payload.avatar.on('end', (error) => {
        if (error) return reject(error);
        // pass filename
        return resolve(`${newFileName}_${payload.avatar.hapi.filename}`);
      });
    });

    const updateAvatarOnUser = filename =>
      User
        .findOne({
          _id,
        })
        .then((user) => {
          user.set('avatar', filename);
          return user.save();
        });

    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      default:
        reply.badImplementation(error);
      }
    };

    uploadAvatar
      .then(updateAvatarOnUser)
      .then(successHandler)
      .catch(errorHandler);
  },

  getFriends(request, reply) {
    // init
    const {
      userId: _id,
    } = request.auth.credentials;

    const successHandler = (user) => {
      // if empty, send back an empty array
      return reply(user.get('friends'));
    };

    const errorHandler = (error) => {
      switch (error.code) {
      default:
        reply.badImplementation(error);
      }
    };

    const excludedProps = ['created_at', 'updated_at',
      'accessTokens', 'password', 'passwordToken', 'social', 'email'];

    User
      .populate('friends', User.exclude(excludedProps))
      .findOne({
        _id,
      })
      .then(successHandler)
      .catch(errorHandler);
  },

  addFriend(request, reply) {
    // todo check for added id validate
    // param
    const {
      userId: _id,
    } = request.auth.credentials;
    const payload = request.payload;

    const addFriend = (user) => {
      const friends = user.get('friends');

      friends.push(new ObjectId(payload[0]));

      user.set('friends', friends);
      return user.save();
    };

    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      default:
        reply.badImplementation(error);
      }
    };

    User
      .findOne({
        _id,
      })
      .then(addFriend)
      .then(successHandler)
      .catch(errorHandler);
  },

  removeFriend(request, reply) {
    // param
    const {
      userId: _id,
    } = request.auth.credentials;
    const userId = request.params.userId;

    const removeFriends = (user) => {
      const friends = user.get('friends');

      const removedFriends = _.remove(friends, obj => obj === userId);

      user.set('friends', removedFriends);

      return user.save();
    };

    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      default:
        reply.badImplementation(error);
      }
    };

    User
      .findOne({
        _id,
      })
      .then(removeFriends)
      .then(successHandler)
      .catch(errorHandler);
  },

};

export default UserController;
