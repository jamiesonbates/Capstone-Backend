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

router.get('/', (req, res) => {
  res.send('Hi from API!!!');
});

router.get('/police_reports/:lat/:lng/:range', (req, res) => {
  knex.raw(`
    SELECT * FROM police_reports WHERE ST_DWithin(police_reports.location, ST_POINT(${parseFloat(req.params.lng)}, ${parseFloat(req.params.lat)}), ${req.params.range})
  `)
  .then((data) => {
    res.send(data.rows);
  });
});

router.get('/runjob', (req, res) => {
  runDatabaseJob()
    .then(() => {
      sendAlertsJob();
    })
    .then(() => {
      console.log('Job was successful');
      res.send(true);
    })
    .catch((err) => {
      console.error(err);
      res.send(false);
    });
});

module.exports = router;
