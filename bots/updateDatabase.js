'use strict';

// Dependencies
const axios = require('axios');
const { camelizeKeys, decamelizeKeys } = require('humps');
const knex = require('../knex');
const moment = require('moment');

// Delete reports that are older than 1 year old
const deleteOldReports = function() {
  const now = moment();
  const oneYearAgo = moment().subtract(1, 'years');

  return knex('police_reports')
    .where('date_occurred', '<', oneYearAgo)
    .del();
}

// Get police reports from API within "length" months
const getPoliceReports = function(length) {
  const base = `https://data.seattle.gov/resource/y7pv-r3kh.json?$limit=5000&$where=date_reported >`;
  const oneMonthAgo = moment().subtract(length, 'months').format('YYYY-MM-DDTHH:mm:ss.SSS');
  const url = `${base} '${oneMonthAgo}'`;

  return axios.get(url)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.error(err);
    });
};

const getCrimeDictionary = function() {
  return knex('offense_types');
}

// Remove unneeded fields, alter some key names, filter by type of crime
const prepareDataForConsumption = function(reports, crimeDictionary) {
  const filteredReports = reports.filter(report => {
    for (const offense of decamelizeKeys(crimeDictionary)) {
      const offenseType = offense.summarized_offense_type;
      const reportType =  report.summarized_offense_description;

      if (offenseType === reportType) {
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

  console.log(filteredReports);
  return filteredReports;
};

// Remove duplicate reports given by API (unique key is general_offense_number)
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

// Get police reports from DB within "length" months
const getDataWithinDateRange = function(length) {
  const now = moment();
  const oneMonthAgo = moment().subtract(length, 'months');

  return knex('police_reports').whereBetween('date_reported', [oneMonthAgo, now]);
}

// Identify new data and insert into DB
const identifyNewDataAndInsert = function(report) {
  const promise = new Promise((resolve, reject) => {
    knex('police_reports')
      .where('general_offense_number', parseInt(report.general_offense_number))
      .then((row) => {
        if (!row.length) {
          if (report.specific_offense_code === 'X') {
            report.specific_offense_code = null;
          }

          return knex.raw(`
            INSERT INTO police_reports (
              date_reported,
              district_sector,
              general_offense_number,
              hundred_block,
              offense_type_id,
              latitude,
              longitude,
              location,
              date_occurred,
              specific_offense_code,
              specific_offense_code_extension,
              specific_offense_type,
              zone_beat,
              new,
              created_at,
              updated_at
            )
            VALUES (
              '${report.date_reported}',
              '${report.district_sector}',
              ${report.general_offense_number},
              '${report.hundred_block}',
              ${report.offense_type_id},
              ${report.latitude},
              ${report.longitude}, ST_GeographyFromText('SRID=4326;POINT(${report.longitude} ${report.latitude})'),
              '${report.date_occurred}',
              ${report.specific_offense_code}, ${report.specific_offense_code_extension}, '${report.specific_offense_type}',
              '${report.zone_beat}',
              ${true},
              '${moment().format('YYYY-MM-DDTHH:mm:ss.SSS')}',
              '${moment().format('YYYY-MM-DDTHH:mm:ss.SSS')}'
            )
          `)
        }

        return;
      })
      .then(() => {
        resolve();
      })
      .catch((err) => {
        console.error(err);
        reject();
      });
  });

  return promise;
}

// Identify police reports from API that have been altered
const identifyAlteredData = function(apiData, dbData) {
  const toBeUpdated = dbData.reduce((acc, dbRecord) => {
    for (const apiRecord of apiData) {
      const apiIdentifier = apiRecord.general_offense_number;
      const dbIdentifier = dbRecord.general_offense_number;

      if (apiIdentifier === dbIdentifier) {
        const dbRecordKeys = Object.keys(dbRecord);
        const keysToCheck = ['hundred_block', 'zone_beat', 'district_sector', 'specific_offense_code', 'specific_offense_code_extension', 'specific_offense_type'];
        const isDifferent = dbRecordKeys.reduce((acc2, key) => {
          if (apiRecord[key] !== dbRecord[key] && keysToCheck.includes(key)) {
            acc2 = true;

            return acc2;
          }

          return acc2;
        }, false);

        if (isDifferent) {
          apiRecord.id = dbRecord.id;
          acc.push(apiRecord);

          return acc;
        }
      }
    }

    return acc;
  }, []);

  return toBeUpdated;
};

// Update row w/ police report in place if it was found to be altered from API
const updateAlteredData = function(report) {
  const promise = new Promise((resolve, reject) => {
    return knex('police_reports').where('id', report.id).update(report)
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });

  return promise;
}

// Use above functions to update the database in this scheduled job
const runDatabaseJob = function() {
  let dataFromAPI;
  let dataFromDB;
  let crimeDictionary;
  console.log('deleteOldReports');
  return deleteOldReports()
    .then(() => {
      console.log(getCrimeDictionary);
      return getCrimeDictionary();
    })
    .then((data) => {
      crimeDictionary = data;
      console.log('getPoliceReports');
      return getPoliceReports(12);
    })
    .then((data) => {
      console.log(data.length);
      console.log('prepareDataForConsumption');
      return prepareDataForConsumption(data, crimeDictionary);
    })
    .then((data) => {
      console.log(data.length);
      console.log('removeDuplicateReports');
      return removeDuplicateReports(data);
    })
    .then((data) => {
      dataFromAPI = data;
      console.log(dataFromAPI.length);
      console.log('getDataWithinDateRange');
      return getDataWithinDateRange();
    })
    .then((data) => {
      dataFromDB = data;

      const res = [];

      for (const record of dataFromAPI) {
        res.push(identifyNewDataAndInsert(record));
      }
      console.log('Promise.all() identifyNewDataAndInsert');
      return Promise.all(res);
    })
    .then(() => {
      console.log('identifyAlteredData');
      return identifyAlteredData(dataFromAPI, dataFromDB);
    })
    .then((toBeUpdated) => {
      const res = [];

      for (const record of toBeUpdated) {
        res.push(updateAlteredData(res));
      }
      console.log('updateAlteredData');
      return Promise.all(res);
    })
    .then(() => {
      console.log('updateDatabase successful');
      return;
    })
    .catch((err) => {
      console.log('Failure :(');
      console.error(err);
    });
}

module.exports = {
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
}
