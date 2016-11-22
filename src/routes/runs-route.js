import joi from 'joi';
import objectId from 'joi-objectid';
import RunsController from '~/controllers/runs-controller';
// store objectid validator
joi.objectId = objectId(joi);

const runsRoute = [
  /* RUN */
  {
    path: '/v1/runs',
    method: 'GET',
    handler: RunsController.get,
    config: {
      validate: {
        query: {
          raceId: joi.objectId().optional(),
        },
      },
    },
  },
  {
    path: '/v1/runs',
    method: 'POST',
    handler: RunsController.create,
    config: {
      auth: 'access_token',
      validate: {
        payload: {
          raceId: joi.objectId().required(),
          date: joi.date().required(),
        },
      },
    },
  },
  {
    path: '/v1/runs/{runId}',
    method: 'GET',
    handler: RunsController.getById,
    config: {
      validate: {
        params: {
          runId: joi.objectId().required(),
        },
      },
    },
  },
  /* RUNNERS */
  {
    path: '/v1/runs/{runId}/runners',
    method: 'GET',
    handler: RunsController.getRunners,
    config: {
      validate: {
        params: {
          runId: joi.objectId().required(),
        },
      },
    },
  },
  {
    path: '/v1/runs/{runId}/runners',
    method: 'POST',
    handler: RunsController.addRunner,
    config: {
      auth: 'access_token',
      validate: {
        params: {
          runId: joi.objectId().required(),
        },
      },
    },
  },
  {
    path: '/v1/runs/{runId}/runners',
    method: 'DELETE',
    handler: RunsController.deleteRunner,
    config: {
      auth: 'access_token',
      validate: {
        params: {
          runId: joi.objectId().required(),
        },
      },
    },
  },
  /* RESULTS */
  {
    path: '/v1/runs/{runId}/results',
    method: 'GET',
    handler: RunsController.getResults,
    config: {
      validate: {
        params: {
          runId: joi.objectId().required(),
        },
      },
    },
  },
  {
    path: '/v1/runs/{runId}/results',
    method: 'POST',
    handler: RunsController.addResult,
    config: {
      auth: 'access_token',
      validate: {
        params: {
          runId: joi.objectId().required(),
        },
        payload: {
          userId: joi.objectId().required(),
          time: joi.object().keys({
            minutes: joi.number().integer().positive().required(),
            seconds: joi.number().integer().positive().required(),
            milliseconds: joi.number().integer().positive().required(),
          }),
        },
      },
    },
  },
];

export default runsRoute;
