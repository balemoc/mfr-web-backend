import {
  ObjectId,
} from 'mongorito';
import Promise from 'bluebird';
import _ from 'lodash';
import moment from 'moment';

import Race from '~/models/race-model';
import Run from '~/models/run-model';
import User from '~/models/user-model';

const RunsController = {
  /*
    RUNS
  */
  get(request, reply) {
    // filter
    const raceId = request.query.race_id;

    const query = {};

    if (raceId) query.race_id = raceId;

    const successHandler = (runs) => reply(runs);

    const errorHandler = (error) => reply.badImplementation(error);

    Run
      .exclude(['created_at', 'updated_at'])
      .find(query)
      .then(successHandler)
      .catch(errorHandler);
  },

  create(request, reply) {
    const {
      race_id,
      date,
    } = request.payload;

    // parse input data
    const raceId = new ObjectId(race_id);
    const runDate = moment(new Date(date)).toDate();

    // check for race
    const checkRace = (race) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(race);
    };

    const createAndSaveRun = () => {
      const run = new Run(
        {
          race_id: raceId,
          date: runDate,
          runners: [],
          results: [],
        });

      run.save();
    };

    const successHandler = (run) => reply(run);
    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      default:
        reply.badImplementation();
      }
    };

    Race
      .findOne({
        _id: raceId,
      })
      .then(checkRace)
      .then(createAndSaveRun)
      .then(successHandler)
      .catch(errorHandler);
  },

  getById(request, reply) {
    const runId = new ObjectId(request.params.runId);

    const successHandler = (run) => {
      if (!run) {
        return Promise.reject({
          code: 0,
        });
      }
      return reply(run);
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

    Run
      .exclude(['created_at', 'updated_at'])
      .findOne({
        _id: runId,
      })
      .then(successHandler)
      .catch(errorHandler);
  },

  /* RUNNERS */
  getRunners(request, reply) {
    const runId = request.params.runId;

    Run
      .findOne({
        _id: runId,
      })
      .then((run) => reply(run.get('runners') || []))
      .catch((error) => reply.badImplementation(error));
  },

  addRunner(request, reply) {
    // userid convert to ObjectId
    const userId = new ObjectId(request.auth.credentials.user_id);
    // runid convert to ObjectId
    const runId = new ObjectId(request.params.runId);
    // set up new runner
    const newRunner = {
      user_id: userId,
      date_of_join: moment().toDate(), // date now
    };

    const checkRun = (run) => {
      if (!run) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(run);
    };

    const checkRunner = (run) => {
      // get runners and if undefined, set new array
      const runners = run.get('runners');
      // check if user already submitted
      const isMatch = _.find(runners, ['user_id', userId]);

      // reject
      if (isMatch) {
        return Promise.reject({
          code: 1,
        });
      }
      return Promise.resolve(run);
    };

    // add runner
    const addRunner = (run) => {
      const runners = run.get('runners');
      // first runner
      if (_.isEmpty(runners)) {
        // set init bib
        newRunner.bib = 1;
      } else { // calculate bib
        // get runner with highest bib
        const runnerWithHighestBib = _(runners).sortBy('bib').last();
        // set + 1
        newRunner.bib = runnerWithHighestBib.bib + 1;
      }
      // push to array
      runners.push(newRunner);
      // set with new runners
      run.set('runners', runners);

      run.save();
    };

    const successHandler = () => reply();

    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound(); // there is no run
        break;
      case 1:
        reply.conflict(); // already submitted runner
        break;
      default:
        reply.badImplementation();
      }
    };

    Run
      .findOne({
        _id: runId,
      })
      .then(checkRun)
      .then(checkRunner)
      .then(addRunner)
      .then(successHandler)
      .catch(errorHandler);
  },

  deleteRunner(request, reply) {
    // get userId
    const userId = new ObjectId(request.auth.credentials.user_id);
    // get runId
    const runId = new ObjectId(request.params.runId);

    const checkRun = (run) => {
      if (!run) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(run);
    };

    const deleteRunner = (run) => {
      // get runners from run
      const runners = run.get('runners') || [];
      // search for user
      const matchIndex = _.findIndex(runners, ['user_id', userId]);
      // set new array for runners
      let newRunners = null;

      if (matchIndex !== -1) { // watchout for === 0 check
        // remove user from it
        newRunners = _.remove(runners, (runner) => runner.user_id === userId);
        // store new array of runners
        run.set('runners', newRunners);
        run.save();

        return Promise.resolve();
      }
      return Promise.reject({
        code: 1,
      });
    };

    const successHandler = () => reply();
    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound('Run');
        break;
      case 1:
        reply.notFound('Runner');
        break;
      default:
        reply.badImplementation(error);
      }
    };

    Run
      .findOne({
        _id: runId,
      })
      .then(checkRun)
      .then(deleteRunner)
      .then(successHandler)
      .catch(errorHandler);
  },

  /* RESULTS */
  getResults(request, reply) {
    const runId = request.params.runId;

    const checkRun = (run) => {
      if (!run) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(run);
    };

    const successHandler = (run) => {
      reply(run.get('results'));
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

    Run
      .exclude(['created_at', 'updated_at'])
      .findOne({
        _id: runId,
      })
      .then(checkRun)
      .then(successHandler)
      .catch(errorHandler);
  },

  addResult(request, reply) {
    // userid convert to ObjectId
    const userId = new ObjectId(request.payload.user_id);
    // runid convert to ObjectId
    const runId = new ObjectId(request.params.runId);
    // time
    const {
      minutes,
      seconds,
      milliseconds,
    } = request.payload.time;

    const duration = moment.duration({
      minutes,
      seconds,
      milliseconds,
    });

    // find user
    const checkUser = new Promise((resolve, reject) => {
      User
        .findOne({
          _id: userId,
        })
        .then((user) => {
          if (!user) {
            return reject({
              code: 0,
            });
          }
          return resolve(user);
        });
    });

    // find race
    const checkRun = new Promise((resolve, reject) => {
      Run
        .findOne({
          _id: runId,
        })
        .then((run) => {
          if (!run) {
            return reject({
              code: 1,
            });
          }
          return resolve(run);
        });
    });

    const checkResult = (values) => {
      // parse incoming values
      const user = values[0];
      const run = values[1];
      const results = run.get('results');
      // check if user already submitted
      const isMatch = _.find(results, ['user_id', user.get('_id')]);

      // already submitted result
      if (isMatch) {
        return Promise.reject({
          code: 2,
        });
      }

      results.push({
        user_id: user.get('_id'),
        time: duration.toJSON(),
      });

      run.set('results', results);
      run.save();

      return Promise.resolve();
    };

    const successHandler = () => reply();
    const errorHandler = (error) => {
      switch (error.code) {
      case 0:
        reply.notFound();
        break;
      case 1:
        reply.notFound();
        break;
      case 2:
        reply.conflict();
        break;
      default:
        reply.badImplementation(error);
      }
    };

    Promise
      .all([checkUser, checkRun])
      .then(checkResult)
      .then(successHandler)
      .catch(errorHandler);
  },
};

export default RunsController;
