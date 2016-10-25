import _ from 'lodash';
import {
  ObjectId,
} from 'mongorito';

import Run from '~/models/run-model';
import Race from '~/models/race-model';

const RacesController = {
  get(request, reply) {
    Race
      .populate('runs', Run)
      .exclude(['created_at', 'updated_at'])
      .find()
      .then((races) => reply(races))
      .catch((error) => reply.badImplementation(error));
  },

  create(request, reply) {
    const {
      user_id,
    } = request.auth.credentials;
    const newRace = request.payload;

    newRace.created_by = new ObjectId(user_id);
    newRace.runs = [];
    newRace.logo = '';

    const race = new Race(newRace);

    race
      .save()
      .then(() => reply())
      .catch((error) => reply.badImplementation(error));
  },

  getById(request, reply) {
    const {
      raceId,
    } = request.params;

    const checkRace = (race) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(race);
    };

    const successHandler = (race) => reply(race);

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    Race
      .exclude(['created_at', 'updated_at'])
      .findOne({
        _id: raceId,
      })
      .then(checkRace)
      .then(successHandler)
      .catch(errorHandler);
  },

  // TODO clear / validate
  editById(request, reply) {
    const {
      raceId,
    } = request.params;

    const fieldsToEdit = request.payload;

    const checkRaceId = (race) => {
      if (!race) return Promise.reject();
      return race;
    };

    const parseFields = (race) => {
      console.log(race);
    };

    const successHandler = (race) => {
      if (!race) return reply.notFound();
      return reply();
    };

    Race
      .findOne({
        _id: raceId,
      })
      .then(checkRaceId)
      .then(parseFields)
      .then(successHandler)
      .catch((error) => reply.badImplementation(error));
  },

  getRuns(request, reply) {
    const raceId = new ObjectId(request.params.raceId);

    Race
      .populate('runs', Run)
      .findOne({
        _id: raceId,
      })
      .then((race) => reply(race.get('runs')))
      .catch((error) => reply(error));
  },

};

export default RacesController;
