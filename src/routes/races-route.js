import joi from 'joi';
import objectId from 'joi-objectid';
import RaceController from '~/controllers/races-controller.js';
// store objectid validator
joi.objectId = objectId(joi);

const racesRoute = [
  {
    path: '/v1/races',
    method: 'GET',
    handler: RaceController.get,
  },
  {
    path: '/v1/races',
    method: 'POST',
    handler: RaceController.create,
    config: {
      auth: 'access_token',
      validate: {
        payload: joi.object().keys({
          title: joi.string().required(),
          description: joi.string().required(),
          risk: joi.string().optional(),
          limit_of_runners: joi.number().integer().positive(),
          distance: joi.number().positive().required(),
          map: joi.object().keys({
            coordinates: joi.object().keys({
              lat: joi.number().required(),
              lng: joi.number().required(),
            }).required(),
            markers: joi.object().keys({
              start: joi.object().keys({
                lat: joi.number().required(),
                lng: joi.number().required(),
              }).required(),
              end: joi.object().keys({
                lat: joi.number().required(),
                lng: joi.number().required(),
              }),
            }).required(),
            polyline: joi.array().min(2).items(
              joi.object().keys({
                lat: joi.number().required(),
                lng: joi.number().required(),
              }),
              joi.object().keys({
                lat: joi.number().required(),
                lng: joi.number().required(),
              }),
            ),
          }).required(),
        }),
      },
    },
  },
  {
    path: '/v1/races/{raceId}',
    method: 'GET',
    handler: RaceController.getById,
    config: {
      validate: {
        params: {
          raceId: joi.objectId().required(),
        },
      },
    },
  },
  {
    // todo
    path: '/v1/races/{raceId}',
    method: 'PATCH',
    handler: RaceController.editById,
    config: {
      auth: 'access_token',
      validate: {
        params: {
          raceId: joi.objectId().required(),
        },
      },
    },
  },
  {
    path: '/v1/races/{raceId}/runs',
    method: 'GET',
    handler: RaceController.getRuns,
    config: {
      validate: {
        params: {
          raceId: joi.objectId().required(),
        },
      },
    },
  },
];

export default racesRoute;
