'use strict';

const knex = require('../../knex');
const router = require('express').Router();
const bcrypt = require('bcrypt-as-promised');
const boom = require('boom');
const jwt = require('jsonwebtoken');
const { camelizeKeys, decamelizeKeys } = require('humps');

const {
  sendAlertsJob,
  getAllAlerts,
  checkForMatches,
  mapMatchesToUsers,
  sendAlertsFromMatches
} = require('../../bots/sendAlerts');

const {
  runDatabaseJob,
  deleteOldReports,
  getPoliceReports,
  getCrimeDictionary,
  prepareDataForConsumption,
  getDataWithinDateRange,
  removeDuplicateReports,
  identifyNewDataAndInsert,
  identifyAlteredData,
  updateAlteredData
} = require('../../bots/updateDatabase');

router.get('/police_reports/:lat/:lng/:range', (req, res, next) => {
  knex.raw(`
    SELECT *
    FROM police_reports
    INNER JOIN offense_types ON police_reports.offense_type_id = offense_types.id
    WHERE ST_DWithin(police_reports.location, ST_POINT(${parseFloat(req.params.lng)}, ${parseFloat(req.params.lat)}), ${req.params.range})
  `)
  .then((data) => {
    res.send(data.rows);
  })
  .catch((err) => {
    next(err);
  })
});

router.get('/runjob', (req, res, next) => {
  runDatabaseJob()
    .then(() => {
      sendAlertsJob();
    })
    .then(() => {
      res.send(true);
    })
    .catch((err) => {
      next(err);
    });
});

const authorize = function(req, res, next) {
  jwt.verify(req.cookies.token, process.env.JWT_KEY, (err, payload) => {
    if (err) {
      return next(boom.create(401, 'Unauthorized'));
    }

    req.claim = payload;

    next();
  });
};

router.get('/users', authorize, (req, res, next) => {
  knex('users')
    .where('id', req.claim.userId)
    .first()
    .then((user) => {
      if (!user) {
        throw boom.create(404, 'User not found');
      }

      delete user.hashed_password;

      res.send(camelizeKeys(user));
    })
    .catch((err) => {
      next(err);
    });
});

router.post('/users', (req, res, next) => {
  const { email, username, password, home_lat, home_lng } = req.body;

  if (!email || !email.trim()) {
    return next(boom.create(400, 'Email must not be blank'));
  }

  if (!password || password.length < 8) {
    return next(boom.create(400, 'Password must be at least 8 characters long'));
  }

  knex('users')
    .where('email', email)
    .first()
    .then((existingUser) => {
      if (existingUser) {
        return next(boom.create(400, 'Email already exists'));
      }

      return bcrypt.hash(password, 12);
    })
    .then((hashedPassword) => {
      return knex('users')
        .insert(decamelizeKeys({ email, username, hashedPassword, home_lat, home_lng}), '*');
    })
    .then((users) => {
      const user = camelizeKeys(users[0]);

      const claim = { userId: user.id };
      const token = jwt.sign(claim, process.env.JWT_KEY, {
        expiresIn: '500 days'
      });

      console.log('here');
      res.cookie('token', token, {
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 500),
        secure: router.get('env') === 'production'
      });

      delete user.hashedPassword;

      res.send(user);
    })
    .catch((err) => {
      next(err);
    });
});

router.get('/token', (req, res) => {
  jwt.verify(req.cookies.token, process.env.JWT_KEY, (err, _claim) => {
    if (err) {
      return res.send(false);
    }

    res.send(true);
  });
});

router.post('/token', (req, res, next) => {
  let user;

  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return next(boom.create(400, 'Email must not be blank'));
  }

  if (!password || !password.trim()) {
    return next(boom.create(400, 'Password must not be blank'));
  }

  knex('users')
    .where('email', email)
    .first()
    .then((row) => {
      if (!row) {
        throw boom.create(400, 'Bad email or password');
      }

      user = camelizeKeys(row);

      return bcrypt.compare(password, user.hashedPassword);
    })
    .then(() => {
      const claim = { userId: user.id };
      const token = jwt.sign(claim, process.env.JWT_KEY, {
        expiresIn: '7 days'
      });

      res.cookie('token', token, {
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        secure: router.get('env') === 'production'
      });

      delete user.hashedPassword;

      res.send(user);
    })
    .catch(bcrypt.MISMATCH_ERROR, () => {
      throw boom.create(400, 'Bad email or password');
    })
    .catch((err) => {
      next(err);
    });
});

router.delete('/token', (req, res) => {
  res.clearCookie('token');
  res.send(false);
});

router.get('/alerts/:userId', (req, res) => {
  knex('alerts')
    .innerJoin('offense_types', 'alerts.offense_type_id', 'offense_types.id')
    .where('alerts.user_id', req.params.userId)
    .then((alerts) => {
      res.send(alerts);
    })
    .catch((err) => {
      next(err);
    });
});

router.get('/locations/:userId', (req, res) => {
  knex('user_alert_locations')
    .where('user_id', req.params.userId)
    .then((locations) => {
      res.send(locations)
    })
    .catch((err) => {
      next(err);
    });
})

module.exports = router;
