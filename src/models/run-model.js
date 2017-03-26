import {
  Model,
} from 'mongorito';

class RunModel extends Model {
  collection() {
    return 'runs';
  }
}

export default RunModel;
