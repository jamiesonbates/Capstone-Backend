'use strict';

process.env.NODE_ENV = 'test';

// Dependencies
const assert = require('chai').assert;
const { camelizeKeys, decamelizeKeys } = require('humps');
const knex = require('../knex');
const moment = require('moment');
const { suite, test } = require('mocha');

// Functions
const {
  getPoliceReports,
  prepareDataForConsumption,
  getDataWithinDateRange,
  removeDuplicateReports,
  identifyNewDataAndInsert
} = require('../bots/updateDatabase');

// Data
const sampleResponse = require('./testdata/sampleResponse');
const crimeDictionary = require('./testdata/crimeDictionary');
const filteredResults = require('./testdata/filteredResults');
const reportsForTestDB = require('./testdata/reportsForTestDB');
const reportsWithNewData = require('./testdata/reportsWithNewData');

beforeEach(done => {
  knex.migrate.latest()
  .then(() => {
    return knex.seed.run();
  })
  .then(() => done())
  .catch((err) => {
    done(err);
  });
});

suite('getPoliceReports function', () => {
  test('obtains a valid set of police reports with given keys', (done) => {
    getPoliceReports()
      .then((results) => {
        assert.deepEqual(Object.keys(results[0]), Object.keys(sampleResponse[0]));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});

suite('prepareDataForConsumption function', () => {
  const results = prepareDataForConsumption(sampleResponse);

  test('takes in array of objects and filters based on dictionary', (done) => {
    assert.deepEqual(results, filteredResults);
    done();
  });

  test('assigns a offense_type_id to each object', (done) => {
    for (const result of results) {
      assert.isNumber(result.offense_type_id);
    }
    done();
  });

  test('delete unneeded keys', (done) => {
    const resultKeys = Object.keys(results[0]);

    assert.notInclude(resultKeys, 'census_tract_2000', 'array not include key');
    assert.notInclude(resultKeys, 'location', 'array not include key');
    assert.notInclude(resultKeys, 'month', 'array not include key');
    assert.notInclude(resultKeys, 'year', 'array not include key');
    assert.notInclude(resultKeys, 'rms_cdw_id', 'array not include key');
    assert.notInclude(resultKeys, 'summarized_offense_description', 'array not include key');
    assert.notInclude(resultKeys, 'summarized_offense_type', 'array not include key');
    assert.notInclude(resultKeys, 'summarized_offense_code', 'array not include key');
    assert.notInclude(resultKeys, 'occured_date_range_end', 'array not include key');
    done();
  });
});

suite('getMatchingData function', () => {
  test('gets data from database based upon time', (done) => {
    getDataWithinDateRange()
      .then((results) => {
        assert.deepEqual(results.length, reportsForTestDB.length - 1);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});

suite('removeDuplicateReports function', () => {
  test('removes duplicates in API data', (done) => {
    const results = removeDuplicateReports(sampleResponse);

    assert.isBelow(results.length, sampleResponse.length);
    done();
  });
});

suite('identifyNewDataAndInsert function', () => {
  test('function should insert a new row', (done) => {
    const promises = [];

    for (const report of reportsWithNewData) {
      promises.push(identifyNewDataAndInsert(report));
    }

    Promise.all(promises)
        .then(() => {
          return knex('police_reports')
            .where('general_offense_number', 201779999);
        })
        .then((row) => {
          delete row.id;

          console.log(row);
          assert.deepEqual(row[0], {
            date_reported: '2017-03-01T11:25:00.000',
            district_sector: 'W',
            general_offense_number: '201779999',
            hundred_block: '44 AV SW / SW ADMIRAL WY',
            offense_type_id: 1,
            latitude: '47.581176758',
            longitude: '-122.387863159',
            date_occurred: '2017-02-28T21:00:00.000',
            specific_offense_code: '2404',
            specific_offense_code_extension: '1',
            specific_offense_type: 'VEH-THEFT-AUTO',
            zone_beat: 'W1'
          });

          done();
        })
        .catch((err) => {
          console.error(err);
        })
  });
})

// afterEach(done => {
//   knex.schema.dropTable('police_reports')
//     .then(() => {
//       return knex.schema.dropTable('offense_types');
//     })
//     .then(() => done())
//     .catch((err) => {
//       done(err);
//     });
// });
