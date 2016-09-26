import AuthController from '~/controllers/auth-controller';

const authRoute = [
  {
    path: '/v1/auth',
    method: 'POST',
    handler: AuthController.login,
  },
];

export default authRoute;
