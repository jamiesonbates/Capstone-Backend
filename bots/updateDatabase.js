'use strict';

const axios = require('axios');
const { camelizeKeys, decamelizeKeys } = require('humps');
const knex = require('../knex');
const moment = require('moment');

const crimeDictionary = require('../test/testdata/crimeDictionary');

const getPoliceReports = function() {
  const url = `https://data.seattle.gov/resource/y7pv-r3kh.json?$where=date_reported > '2017-03-01T11:19:00.000'`;
  return axios.get(url)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.error(err);
    });
};

const filterReports = function(reports) {
  const filteredReports = reports.filter(report => {
    for (const offense of crimeDictionary) {
      if (offense.summarizedOffenseType === report.summarized_offense_description) {
        return report;
      }
    }
  })

  return filteredReports;
}

const getMatchingData = function() {

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
  filterReports
}
