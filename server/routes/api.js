'use strict';

const knex = require('../../knex');
const router = require('express').Router();
const bcrypt = require('bcrypt-as-promised');

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
    SELECT * FROM police_reports WHERE ST_DWithin(police_reports.location, ST_POINT(${parseFloat(req.params.lng)}, ${parseFloat(req.params.lat)}), ${req.params.range})
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

router.post('/users', (req, res, next) => {
  const { email, username, password, home_lat, home_lng} = req.body;
  console.log(req.body);

  bcrypt.hash(req.body.password, 12)
    .then((hashed_password) => {
      return knex('users').insert({
        email,
        username,
        hashed_password,
        home_lat: home_lat,
        home_lng: home_lng
      }, '*')
    })
    .then((users) => {
      console.log('users', users[0]);
      const user = users[0];
      console.log(user);

      delete user.hashed_password;

      res.send(user);
    })
    .catch((err) => {
      next(err);
    });
});

module.exports = router;
