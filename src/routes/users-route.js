import UsersController from '~/controllers/users-controller';

const usersRoute = [
  {
    path: '/v1/users/reset_password',
    method: 'POST',
    handler: UsersController.resetPassword,
  },
  {
    path: '/v1/users/recover_password',
    method: 'POST',
    handler: UsersController.recoverPassword,
    config: {
      auth: 'password_token',
    },
  },
  {
    path: '/v1/users',
    method: 'POST',
    handler: UsersController.createUser,
  },

  {
    path: '/v1/users/{id}',
    method: 'GET',
    handler: UsersController.getUserByID,
  },
  /*
  {
    path: '/v1/users',
    method: 'GET',
    handler: UsersController.getAllUsers,
    // search
  },
  */
];

export default usersRoute;
