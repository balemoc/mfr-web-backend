import {
  Model,
} from 'mongorito';

class Accesstoken extends Model {
  collection() {
    return 'access_tokens';
  }
}

export default Accesstoken;
