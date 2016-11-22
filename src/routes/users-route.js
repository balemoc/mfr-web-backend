import UsersController from '~/controllers/users-controller';
import joi from 'joi';
import objectId from 'joi-objectid';
// store objectid validator
joi.objectId = objectId(joi);

const usersRoute = [
  {
    path: '/v1/users',
    method: 'GET',
    handler: UsersController.get,
    config: {
      validate: {
        query: joi.object().keys({
          gender: joi.string().length(1)
            .valid('female')
            .valid('male')
            .optional(),
        }),
      },
    },
  },
  {
    path: '/v1/users',
    method: 'POST',
    handler: UsersController.create,
    config: {
      validate: {
        payload: joi.object().keys({
          firstName: joi.string().required().min(3),
          lastName: joi.string().required().min(3),
          email: joi.string().required(),
          password: joi.string().required().min(4),
          birthDate: joi.date().required(),
          gender: joi.string().required().length(1)
            .valid('male')
            .valid('female'),
        }),
      },
    },
  },
  {
    path: '/v1/users/{id}',
    method: 'GET',
    handler: UsersController.getById,
    config: {
      validate: {
        params: joi.object().keys({
          id: joi.objectId().required(),
        }),
      },
    },
  },
];

export default usersRoute;
