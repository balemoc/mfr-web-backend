/*
  Import packages
 */

import * as Hapi from 'hapi';
import * as Inert from 'inert';
import * as Path from 'path';

const server = new Hapi.Server();

/*
  Server settings
 */

server.connection({
    host: 'localhost',
    port: 2000,
});

/*
  Plugins
 */

server.register(Inert, (error) => {
    if (error) {
        throw error;
    }
});

/*
  Routes
 */

// Client side
server.route({
    method: 'GET',
    path: '/{param*}',
    handler: (request, response) => {
        response('MFR');
    },
      /*{
        directory: {
            path: Path.join(__dirname, '/public'),
            listing: true,
        },
    },*/
});

/*
  Start server
 */

server.start((err) => {
    if (err) {
        throw err;
    }
});
