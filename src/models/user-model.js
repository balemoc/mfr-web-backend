import Mongorito from 'mongorito';
import bcrypt from 'bcrypt';
import moment from 'moment';

const actualSchemaVersion = 1;

class User extends Mongorito.Model {
  collection() {
    return 'users';
  }
  /*
    errors
   */

  configure() {
    // schema upgrade hook
    // this.before('update', 'upgradeSchema');
    // update last_activity field
    //this.before('save', 'lastActivity');
  }

  // set last activity
  lastActivity() {
    return new Promise((resolve) => {
      const now = moment().format().toDate();

      this.set('last_activity', now);
      resolve();
    });
  }

  // check if queried schema is older then actual then follow upgrade procedure
  async upgradeSchema(next) {
    const user = this;

    if (user.get('_schema_version') < actualSchemaVersion) {
      User.helpers.upgradeSchema(user.get('_schema_version'), actualSchemaVersion);
    }
    await next;
  }
}

User.helpers = {
  comparePasswords: (passwordToCheck, passwordHash) => {
    return new Promise((resolve, reject) => {
      // param checking
      if (!passwordToCheck || !passwordHash) {
        reject('Missing password');
      }

      bcrypt.compare(passwordToCheck, passwordHash, (error, result) => {
        if (error) {
          reject('Error in hashing');
        }

        if (result) {
          resolve();
        } else {
          reject('Wrong password');
        }
      });
    });
  },

  upgradeLogics: (fromVersion, toVersion) => {
    return true;
  },

  generatePasswordHash: (password) => {
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
