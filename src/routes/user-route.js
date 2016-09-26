import UserController from '~/controllers/user-controller';

const userRoute = [
  {
    path: '/v1/user',
    method: 'PATCH',
    handler: UserController.editUserField,
    config: {
      auth: 'access_token',
    },
  },
  {
    path: '/v1/user',
    method: 'GET',
    handler: UserController.getUserData,
    config: {
      auth: 'access_token',
    },
  },
  {
    path: '/v1/user/avatar',
    method: 'PATCH',
    handler: UserController.uploadAvatar,
    config: {
      //auth: 'access_token',
      payload: {
        output: 'stream',
        parse: true,
        allow: 'multipart/form-data',
      },
    },
  },
];

export default userRoute;
