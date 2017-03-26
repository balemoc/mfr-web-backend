import {
  Model,
} from 'mongorito';
import bcrypt from 'bcrypt';
import Promise from 'bluebird';

class User extends Model {
  collection() {
    return 'users';
  }
  /*
    errors
   */

  static configure() {
    // schema upgrade hook
    // this.before('update', 'upgradeSchema');
    // update last_activity field
    // this.before('save', 'lastActivity');
  }
}

User.helpers = {
  comparePasswords(passwordToCheck, passwordHash) {
    return new Promise((resolve, reject) => {
      // param checking
      if (!passwordToCheck || !passwordHash) {
        reject();
      }

      bcrypt.compare(passwordToCheck, passwordHash, (error, result) => {
        if (result) {
          resolve();
        }
        if (error || !result) {
          reject();
        }
      });
    });
  },

  generatePasswordHash(password) {
    return new Promise((resolve, reject) => {
      // param checking
      if (!password) {
        reject('Missing password');
      }

      bcrypt.hash(password, 6, (error, hash) => {
        if (error) {
          reject(error);
        }

        if (hash) {
          resolve(hash);
        }
      });
    });
  },

};


export default User;
