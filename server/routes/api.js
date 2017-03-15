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

router.get('/runjob', (req, res) => {
  runDatabaseJob()
    .then(() => {
      sendAlertsJob();
    })
    .then(() => {
      console.log('Job was successful');
    })
    .catch((err) => {
      console.error(err);
    });
});

module.exports = router;
