/*
    Import packages
 */

import Hapi from 'hapi';
import Inert from 'inert';
import Path from 'path';
import Blipp from 'blipp';
import Mongorito from 'mongorito';
import BoomDecorator from 'hapi-boom-decorators';
import Jwt from 'hapi-auth-jwt2';
import Good from 'good';
import _ from 'lodash';
import Config from '~/config';
import * as Routes from '~/routes/index';

import AccessToken from '~/models/access-token-model';
import User from '~/models/user-model';

const server = new Hapi.Server();

/*
    Bootstrap & handling few settings
 */

// handling what environment we are
if (process.env.NODE_ENV === 'development') {
  server.app.config = Config.development;
  // store mixed configurations too like jwt sign key
  server.app.config.mixed = Config.mixed;
} else {
  server.app.config = Config.production;
  server.app.config.mixed = Config.mixed;
}

// connect to DB
Mongorito.connect(server.app.config.db.url);

// set default server
server.connection({
  host: '127.0.0.1',
  port: server.app.config.http.port,
  routes: {
    cors: true,
  },
});

// logger options
const goodReporterOptions = {
  ops: {
    interval: 1000, // bind refresh sequence
  },
  reporters: {
    // dev & prod
    console: [{
      module: 'good-squeeze',
      name: 'Squeeze',
      args: [{
        log: '*', response: '*', error: '*',
      }],
    }, {
      module: 'good-console',
    }, 'stdout'],
      // todo file - prod only
  },
};

// log incoming request's payload
server.on('tail', (request) => {
  server.log(['request'], request.payload);
});

/*
    Plugin registration
 */

// logger
server.register({
  register: Good,
  options: goodReporterOptions,
}, (error) => {
  if (error) {
    throw error;
  }
});

// boom error decorator
server.register(BoomDecorator, (error) => {
  if (error) {
    throw error;
  }
});

// show route table at startup
server.register(Blipp, (error) => {
  if (error) {
    throw error;
  }
});

// static file / directory handler
server.register(Inert, (error) => {
  if (error) {
    throw error;
  }
});

// jwt header token validator
server.register(Jwt, (error) => {
  if (error) {
    throw error;
  }
});

/*
  Additional registration
 */

// password token validation
server.auth.strategy('password_token', 'jwt', {
  key: server.app.config.mixed.security.jwt_key,
  validateFunc: (decodedToken, request, callback) => {
    const encodedToken = request.auth.token;
    const userId = decodedToken.user_id;
    const email = decodedToken.email;

    User
      // find by user email && stored token
      .find({
        _id: userId,
        password_token: encodedToken,
        email,
      })
      // found token & user
      .then((users) => new Promise((resolve, reject) =>
        (users[0] ? resolve() : reject({
          code: 0,
          message: encodedToken,
        }))))
      // let them through
      .then(() => {
        callback(null, true);
      })
      // error
      .catch(() => {
        // block
        callback(null, false);
      });
  },
  verifyOptions: {
    subject: 'password_token', // check if it good token type
  },
});

// access token validation
server.auth.strategy('access_token', 'jwt', {
  key: server.app.config.mixed.security.jwt_key,
  validateFunc: (decodedToken, request, callback) => {
    const encodedToken = request.auth.token;
    const userId = decodedToken.user_id;
    const userEmail = decodedToken.email;

    const getUserData = new Promise((resolve, reject) => {
      User
        .find({
          _id: userId,
        })
        .then((users) => {
          console.log(users);
          resolve(users);
        })
        .catch((err) => {
          reject(err);
        })
    });

    //console.log(decodedToken);
   // console.log(encodedToken);

    Promise
      .all([getUserData])
      .then((results) => {
        console.log(results);
      })
      .catch((error) => {
        console.log(error);
      });

    callback(null, true);

    /*
    // check if accesstoken in db
    const getAccessToken =
      AccessToken
        .find({
          token: encodedToken,
        })
        // found token
        .then((tokens) => new Promise((resolve, reject) =>
          (tokens[0] ? resolve() : reject({
            code: 0,
            message: encodedToken,
          })))
        )
        .catch();
    */

    /*
    // check if user in db
    const getUserData = new Promise((resolve, reject) => {
      User
        .find()
        .then((users) => {})
        .then((user) => {})
        .catch();
    });
    */
   
   /*

    AccessToken
      .find({
        token: encodedToken,
      })
      // found token
      .then((tokens) => new Promise((resolve, reject) =>
        (tokens[0] ? resolve() : reject({
          code: 0,
          message: encodedToken,
        }))))
      // let them through
      .then(() => {
        callback(null, true);
      })
      // error
      .catch(() => {
        // block
        callback(null, false);
      });
      */
  },
  verifyOptions: {
    subject: 'access_token',
  },
});

/*
    Registering routes
 */

server.log(['info'], 'Loading routes & handlers');

// serve client application & uploads
server.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: Path.join(__dirname, 'client'),
      listing: true,
    },
  },
});

// add each route
_.forEach(Routes, (route) => {
  server.route(route);
});

/*
    Start server
 */

server.start((error) => {
  if (error) {
    throw error;
  }

  server.log(['info'], `Server has started at: ${server.info.uri}`);
});
