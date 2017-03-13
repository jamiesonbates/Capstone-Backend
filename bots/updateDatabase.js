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

        delete report.census_tract_2000;
        delete report.location;
        delete report.month;
        delete report.rms_cdw_id;
        delete report.summarized_offense_description;
        delete report.summary_offense_code;
        delete report.year;
        delete report.occurred_date_range_end;

        report.hundred_block = report.hundred_block_location;
        report.date_occurred = report.occurred_date_or_date_range_start;
        report.specific_offense_type = report.offense_type;
        report.specific_offense_code = report.offense_code;
        report.specific_offense_code_extension = report.offense_code_extension;

        delete report.hundred_block_location;
        delete report.occurred_date_or_date_range_start;
        delete report.offense_type;
        delete report.offense_code;
        delete report.offense_code_extension;

        return report;
      }
    }
  });

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

const identifyNewDataAndInsert = function(obj) {
  // console.log('this', obj);
  return knex('police_reports')
    .where('general_offense_number', parseInt(obj.general_offense_number))
    .then((row) => {
      // console.log('this2', row);
      if (!row.length) {
        console.log('got to this place');
        knex('police_reports').insert(obj).returning('*')
          .then((row) => {
            console.log('here', row);
          })
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

const insertNewData = function() {

}

const identifyUpdatedData = function() {

}

const updateData = function() {

}

const runDatabaseJob = function() {
  let dataFromAPI;
  let dataFromDB;

  return getPoliceReports()
    .then((data) => {

      return prepareDataForConsumption(data);
    })
    .then((data) => {
      dataFromAPI = data;

      return getDataWithinDateRange();
    })
    .then((data) => {
      dataFromDB = data;

    });


}

module.exports = {
  runDatabaseJob,
  getPoliceReports,
  prepareDataForConsumption,
  getDataWithinDateRange,
  removeDuplicateReports,
  identifyNewDataAndInsert
}
