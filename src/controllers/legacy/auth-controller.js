import User from '~/models/user-model';
import Async from 'async';
import Bcrypt from 'bcrypt';

class AuthController {

    static signIn(request, reply) {
        reply('ok')
    }

    static signUp(request, reply) {
        reply('ok');
    }

    static signOut(request, reply) {
        reply('ok');
    }

    static forgotPassword(request, reply) {
        reply('ok');
    }

}

export default AuthController;
