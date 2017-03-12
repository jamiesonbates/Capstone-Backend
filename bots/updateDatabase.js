'use strict';

const axios = require('axios');
const { camelizeKeys, decamelizeKeys } = require('humps');
const knex = require('../knex');
const moment = require('moment');

const getPoliceReports = function() {
  const url = `https://data.seattle.gov/resource/y7pv-r3kh.json?$where=date_reported > '2016-10-24T11:19:00.000'`;
  return axios.get(url)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.error(err);
    });
};

const filterReportsWithDictionary = function() {

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
      console.log(data[0]);
    });


}

module.exports = {
  getPoliceReports,
  runDatabaseJob
}
