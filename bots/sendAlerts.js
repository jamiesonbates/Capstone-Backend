'use strict';

// Dependencies
const knex = require('../knex');

// Get all alerts + matching user from DB
const getAllAlerts = function() {
  return knex('alerts').innerJoin('users', 'alerts.user_id', 'users.id');
}

// For each alert, check whether new data is within the alert's given radius
const checkForMatches = function(alert) {
  const promise = new Promise((resolve, reject) => {
    return knex.raw(`
      SELECT * FROM police_reports WHERE ST_DWithin(police_reports.location, ST_POINT(${alert.home_lng}, ${alert.home_lat}), ${alert.range});
    `)
  });

  return promise;
}

// Send alerts that matched with new data
const sendAlertsFromMatches = function() {

}

// This job will get alerts, find matches, and send alerts
const sendAlertsJob = function() {

}

module.exports = {
  sendAlertsJob,
  getAllAlerts,
  checkForMatches,
  sendAlertsFromMatches
};
