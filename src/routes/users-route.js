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
          // TODO FILTER
          /*
          age: joi.number().integer().positive()
            .less(99)
            .greater(14)
            .optional(),
            */
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
          first_name: joi.string().required().min(3),
          last_name: joi.string().required().min(3),
          email: joi.string().required(),
          password: joi.string().required().min(4),
          birth_date: joi.date().required().format('D/M/YYYY'),
          gender: joi.string().required().length(1)
            .valid('male')
            .valid('female'),
          policy: joi.boolean().valid(true),
        }),
      },
    },
  },
  {
    path: '/v1/users/{userId}',
    method: 'GET',
    handler: UsersController.getByID,
    config: {
      validate: {
        params: joi.object().keys({
          userId: joi.objectId().required(),
        }),
      },
    },
  },
];

export default usersRoute;
