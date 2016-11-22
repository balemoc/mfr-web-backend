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
    const {
      raceId,
    } = request.query;

    const query = {};

    if (raceId) query.raceId = raceId;

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

    Run
      .exclude(['created_at', 'updated_at'])
      .find(query)
      .then(successHandler)
      .catch(errorHandler);
  },

  create(request, reply) {
    const {
      raceId: _raceId,
      date: _date,
    } = request.payload;

    // parse input data
    const raceId = new ObjectId(_raceId);
    const date = moment(new Date(_date)).toDate();

    // check for race
    const checkRace = (race) => {
      if (!race) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(race);
    };

    const newRun = {
      raceId,
      date,
    };

    // def fields
    newRun.runners = [];
    newRun.results = [];

    const createAndSaveRun = () => {
      const run = new Run(newRun);

      return run.save();
    };

    const saveOnRace = run =>
      Race
        .findOne({
          _id: raceId,
        })
        .then((race) => {
          const runs = race.get('runs');
          const runId = run.get('_id');

          // push runid to race runs
          runs.push(runId);
          race.set('runs', runs);

          return race.save();
        });

    const successHandler = () => reply();

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
      .then(saveOnRace)
      .then(successHandler)
      .catch(errorHandler);
  },

  getById(request, reply) {
    const {
      runId,
    } = request.params;

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
    const {
      runId,
    } = request.params;

    const checkRun = (run) => {
      if (!run) {
        return Promise.reject({
          code: 0,
        });
      }
      return Promise.resolve(run);
    };

    const successHandler = run => reply(run.get('runners'));

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
      .findOne({
        _id: runId,
      })
      .then(checkRun)
      .then(successHandler)
      .catch(errorHandler);
  },

  addRunner(request, reply) {
    // userid convert to ObjectId
    const {
      userId: _userId,
    } = request.auth.credentials;
    const userId = new ObjectId(_userId);

    // runid convert to ObjectId
    const {
      runId: _runId,
    } = request.params;
    const runId = new ObjectId(_runId);

    // set up new runner
    const newRunner = {
      userId,
      dateOfJoin: moment().toDate(), // date now
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
      // get runners
      const runners = run.get('runners');
      // check if user already submitted
      const isMatch = _.find(runners, ['userId', userId]);

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
      } else {
        // calculate bib
        // get runner with highest bib
        const runnerWithHighestBib = _(runners).sortBy('bib').last();
        // set + 1
        newRunner.bib = runnerWithHighestBib.bib + 1;
      }
      // push to array
      runners.push(newRunner);
      // set with new runners
      run.set('runners', runners);

      return run.save();
    };

    const addJoinedRun = run =>
      User
        .findOne({
          _id: userId,
        })
        .then((user) => {
          const joinedRuns = user.get('joined');

          joinedRuns.push(run.get('_id'));

          user.set('joined', joinedRuns);

          return user.save();
        });

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
      .then(addJoinedRun)
      .then(successHandler)
      .catch(errorHandler);
  },

  deleteRunner(request, reply) {
    // get userId
    const {
      userId,
    } = request.auth.credentials;
    // get runId
    const {
      runId: _runId,
    } = request.params;

    const runId = new ObjectId(_runId);

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

      // remove user from it
      _.remove(runners, runner => runner.userId.equals(userId));
      // store new array of runners
      run.set('runners', runners);

      return run.save();
    };

    const deleteJoinedRun = run =>
      User
        .findOne({
          _id: userId,
        })
        .then((user) => {
          const joinedRuns = user.get('joined');

          _.remove(joinedRuns, runid => runid.equals(run.get('_id')));

          user.set('joined', joinedRuns);

          return user.save();
        });

    const successHandler = () => reply();

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
      .findOne({
        _id: runId,
      })
      .then(checkRun)
      .then(deleteRunner)
      .then(deleteJoinedRun)
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
    // convert userid to objectid
    const {
      userId: _userId,
      time: {
        minutes,
        seconds,
        milliseconds,
      },
    } = request.payload;

    const userId = new ObjectId(_userId);

    // runid convert to ObjectId
    const {
      runId: _runId,
    } = request.params;

    const runId = new ObjectId(_runId);

    // run durations
    const duration = moment.duration({
      minutes,
      seconds,
      milliseconds,
    });

    // todo split get data
    // find user
    const checkUser = () =>
      User
        .findOne({
          _id: userId,
        })
        .then((user) => {
          if (!user) {
            return Promise.reject({
              code: 0,
            });
          }
          return Promise.resolve(user);
        });

    // find run
    const checkRun = () =>
      Run
        .findOne({
          _id: runId,
        })
        .then((run) => {
          if (!run) {
            return Promise.reject({
              code: 1,
            });
          }
          return Promise.resolve(run);
        });

    const checkResult = ([user, run]) => {
      // parse incoming values
      const results = run.get('results');
      // check if user already submitted
      const isMatch = _.find(results, ['userId', user.get('_id')]);

      // already submitted result
      if (isMatch) {
        return Promise.reject({
          code: 2,
        });
      }

      results.push({
        userId: user.get('_id'),
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
      .all([checkUser(), checkRun()])
      .then(checkResult)
      .then(successHandler)
      .catch(errorHandler);
  },
};

export default RunsController;
