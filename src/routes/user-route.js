import joi from 'joi';
import objectId from 'joi-objectid';
import UserController from '~/controllers/user-controller';
// store objectid validator
joi.objectId = objectId(joi);

const userRoute = [
  /* AUTHENTICATION */
  {
    path: '/v1/user',
    method: 'POST',
    handler: UserController.login,
    config: {
      validate: {
        payload: joi.object().keys({
          email: joi.string().email().required(),
          password: joi.string().required(),
        }),
      },
    },
  },
  {
    path: '/v1/user/reset_password',
    method: 'POST',
    handler: UserController.resetPassword,
    config: {
      validate: {
        payload: joi.object().keys({
          email: joi.string().email().required(),
        }),
      },
    },
  },
  {
    path: '/v1/user/recover_password',
    method: 'POST',
    handler: UserController.recoverPassword,
    config: {
      validate: {
        payload: joi.object().keys({
          password: joi.string().required(), // TODO LENGTH
          passwordToken: joi.string().required(),
        }),
      },
    },
  },
  /* PROFILE */
  {
    path: '/v1/user',
    method: 'PATCH',
    handler: UserController.edit,
    config: {
      auth: 'access_token',
      validate: {
        payload: joi.object().keys({
          first_name: joi.string().optional().min(3),
          last_name: joi.string().optional().min(3),
          email: joi.string().optional(),
          birth_date: joi.date().optional().format('D/M/YYYY'),
        }),
      },
    },
  },
  {
    path: '/v1/user',
    method: 'GET',
    handler: UserController.get,
    config: {
      auth: 'access_token',
    },
  },
  /* FRIENDS */
  {
    path: '/v1/user/friends',
    method: 'GET',
    handler: UserController.getFriends,
    config: {
      auth: 'access_token',
    },
  },
  {
    path: '/v1/user/friends',
    method: 'PUT',
    handler: UserController.addFriend,
    config: {
      auth: 'access_token',
      validate: {
        payload: joi.array().length(1).items(joi.objectId()),
      },
    },
  },
  {
    path: '/v1/user/friends/{userId}',
    method: 'DELETE',
    handler: UserController.removeFriend,
    config: {
      auth: 'access_token',
      validate: {
        params: {
          userId: joi.objectId().required(),
        },
        payload: joi.array().length(1).items(joi.objectId()),
      },
    },
  },
  /* AVATAR */
  {
    // TODO validate image
    path: '/v1/user/avatar',
    method: 'POST',
    handler: UserController.uploadAvatar,
    config: {
      auth: 'access_token',
      payload: {
        output: 'stream',
        parse: true,
        allow: 'multipart/form-data',
      },
    },
  },
];

export default userRoute;
