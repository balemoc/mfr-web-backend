import Mongorito from 'mongorito';
import bcrypt from 'bcrypt';
import joi from 'joi';

class Accesstoken extends Mongorito.Model {
  collection() {
    return 'access_tokens';
  }
}

export default Accesstoken;
