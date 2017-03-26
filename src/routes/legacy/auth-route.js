import AuthController from '~/controllers/legacy/auth-controller';

const authRoute = [
  {
    path: '/legacy/signOut',
    method: 'POST',
    handler: AuthController.signOut,
  },
  {
    path: '/legacy/signUp',
    method: 'POST',
    handler: AuthController.signUp,
  },
  {
    path: '/legacy/signIn',
    method: 'POST',
    handler: AuthController.signIn,
  },
  {
    path: '/legacy/forgotPassword',
    method: 'POST',
    handler: AuthController.forgotPassword,
  },
];

export default authRoute;
