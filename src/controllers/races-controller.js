import _ from 'lodash';
import {
  ObjectId,
} from 'mongorito';

import Run from '~/models/run-model';
import Race from '~/models/race-model';

const RacesController = {
  get(request, reply) {
    const excludedProps = ['created_at', 'updated_at',
      'accessTokens', 'password', 'passwordToken', 'social'];

    Race
      .exclude(excludedProps)
      .find()
      .then(races => reply(races))
      .catch(error => reply.badImplementation(error));
  },

  create(request, reply) {
    const {
      userId: _id,
    } = request.auth.credentials;
    const newRace = request.payload;

    newRace.createdBy = new ObjectId(_id);
    // init fields
    newRace.runs = [];
    newRace.logo = '';
    newRace.followedBy = [];
    newRace.favouritedBy = [];
    newRace.joinedBy = [];

    const race = new Race(newRace);

    race
      .save()
      .then(() => reply())
      .catch((error) => reply.badImplementation(error));
  },

  getById(request, reply) {
    const {
      raceId: _id,
    } = request.params;

    const checkRace = (race) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(race);
    };

    const successHandler = race => reply(race);

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
        _id,
      })
      .then(checkRace)
      .then(successHandler)
      .catch(errorHandler);
  },

  // TODO clear / validate
  editById(request, reply) {
    const {
      raceId: _id,
    } = request.params;

    const fields = request.payload;

    const checkRaceId = (race) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(race);
    };

    const parseFields = (race) => {
      console.log(race);
    };

    const successHandler = (race) => {
      if (!race) return reply.notFound();
      return reply();
    };

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
      .findOne({
        _id,
      })
      .then(checkRaceId)
      .then(parseFields)
      .then(successHandler)
      .catch(errorHandler);
  },

  getRuns(request, reply) {
    const {
      raceId: _id,
    } = request.params;

    const checkRace = (race) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(race.get('runs'));
    };

    const successHandler = runs => reply(runs);

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    const excludedProps = ['created_at', 'updated_at'];

    Race
      .populate('runs', Run.exclude(excludedProps))
      .findOne({
        _id,
      })
      .then(checkRace)
      .then(successHandler)
      .catch(errorHandler);
  },

};

export default RacesController;
