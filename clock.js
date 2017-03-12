'use strict';

const CronJob = require('cron').CronJob;

const updateDatabase = require('./bots/updateDatabase');

new CronJob('*/1 * * * * *',
  updateDatabase.runDatabaseJob(),
  null,
  true,
  'America/Los_Angeles'
);
