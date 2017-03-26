import {
  Model,
} from 'mongorito';

class RaceModel extends Model {
  collection() {
    return 'races';
  }
}

export default RaceModel;
