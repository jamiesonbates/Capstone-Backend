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
      SELECT * FROM police_reports WHERE ST_DWithin(police_reports.location, ST_POINT(${parseFloat(alert.home_lng)}, ${parseFloat(alert.home_lat)}), ${alert.range}) AND police_reports.new = true AND police_reports.offense_type_id = ${alert.offense_type_id};
    `)
    .then((data) => {
      if (data.rows.length) {
        const mergedData = alert;
        mergedData.reports = data.rows;
        resolve(mergedData);
      }

      resolve(false);
    });
  });

  return promise;
}

const mapMatchesToUsers = function(matches) {
  const matchesByUser = matches.reduce((acc, match) => {
    const userId = match.user_id;

    if (!acc.hasOwnProperty(userId)) {
      acc[userId] = match;
    }
    else {
      acc[userId].reports = acc[userId].reports.concat(match.reports);
    }

    return acc;
  }, {});

  return matchesByUser;
}

// Send alerts that matched with new data
const sendAlertsFromMatches = function() {

}

// This job will get alerts, find matches, and send alerts
const sendAlertsJob = function() {
  getAllAlerts()
    .then((alerts) => {
      const res = [];

      for (const alert of alerts) {
        res.push(checkForMatches(alert));
      }

      return Promise.all(res);
    })
    .then((data) => {
      const matches = [];
      for (const result of data) {
        if (result) {
          matches.push(result);
        }
      }

      return matches;
    })
    .then((matches) => {
      return mapMatchesToUsers(matches);
    })
    .then((matchesByUser) => {
      console.log(matchesByUser);
    });
}

module.exports = {
  sendAlertsJob,
  getAllAlerts,
  checkForMatches,
  sendAlertsFromMatches
};
