'use strict';

const knex = require('../../knex');
const router = require('express').Router();

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

module.exports = router;
