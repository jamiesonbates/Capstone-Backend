'use strict';

const CronJob = require('cron').CronJob;

const updateDatabase = require('./bots/updateDatabase');
const sendAlerts = require('./bots/sendAlerts');

new CronJob('*/1 * * * * *',
  sendAlerts.sendAlertsJob(),
  null,
  true,
  'America/Los_Angeles'
);
