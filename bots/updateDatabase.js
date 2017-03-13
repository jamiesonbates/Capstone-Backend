'use strict';

const axios = require('axios');
const { camelizeKeys, decamelizeKeys } = require('humps');
const knex = require('../knex');
const moment = require('moment');

const crimeDictionary = require('../test/testdata/crimeDictionary');

const getPoliceReports = function() {
  const base = `https://data.seattle.gov/resource/y7pv-r3kh.json?$where=date_reported >`;
  const oneMonthAgo = moment().subtract(1, 'months').format('YYYY-MM-DDTHH:mm:ss.SSS');
  const url = `${base} '${oneMonthAgo}'`;

  return axios.get(url)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.error(err);
    });
};

const prepareDataForConsumption = function(reports) {
  const filteredReports = reports.filter(report => {
    for (const offense of crimeDictionary) {
      if (offense.summarizedOffenseType === report.summarized_offense_description) {
        report.offense_type_id = offense.id;

        return report;
      }
    }
  })

  return filteredReports;
}

const removeDuplicateReports = function(reports) {
  const newReports = [];

  for (const report of reports) {
    const isDuplicate = newReports.reduce((acc, newReport) => {
      if (report.general_offense_number === newReport.general_offense_number) {
        acc = true;
      }

      return acc;
    }, false);

    if (!isDuplicate) {
      newReports.push(report);
    }
  };

  return newReports;
};

const getDataWithinDateRange = function() {
  const now = moment();
  const oneMonthAgo = moment().subtract(1, 'months');

  return knex('police_reports').whereBetween('date_reported', [oneMonthAgo, now]);
}

const identifyNewData = function() {

}

const insertNewData = function() {

}

const identifyUpdatedData = function() {

}

const updateData = function() {

}

const runDatabaseJob = function() {
  return getPoliceReports()
    .then((data) => {

      return filterReportsWithDictionary(data);
    })
    .then((data) => {
      // console.log(data);
    })


}

module.exports = {
  runDatabaseJob,
  getPoliceReports,
  prepareDataForConsumption,
  getDataWithinDateRange,
  removeDuplicateReports
}
