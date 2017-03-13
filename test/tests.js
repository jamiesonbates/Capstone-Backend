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
  knex.schema.createTable('offense_types', (table) => {
    table.increments();
    table
      .string('summarized_offense_type')
      .notNullable();
    table
      .integer('summarized_offense_code')
      .notNullable();
    table
      .string('offense_name')
      .notNullable();
  })
  .then(() => {
    return knex.schema.createTable('police_reports', (table) => {
      table.increments();
      table
        .integer('general_offense_number')
        .notNullable()
        .unique();
      table
        .integer('offense_type_id')
        .references('id')
        .inTable('offense_types')
        .notNullable()
        .index();
      table.integer('specific_offense_code');
      table.integer('specific_offense_code_extension');
      table.string('specific_offense_type');
      table.timestamp('date_reported');
      table.timestamp('date_occured');
      table
        .float('latitude')
        .notNullable();
      table
        .float('longitude')
        .notNullable();
      table.string('hundred_block');
      table.string('district_sector');
      table.string('zone_beat');
      table.timestamps(true, true);
    });
  })
  .then(() => {
    return knex('offense_types').insert(decamelizeKeys(crimeDictionary));
  })
  .then(() => {
    return knex('police_reports').insert(reportsForTestDB);
  })
  .then(() => {
    done();
  })
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
    identifyNewDataAndInsert(reportsWithNewData)
      .then(() => {
        return knex('police_reports').where('general_offense_number', 201779999);
      })
      .then((row) => {
        assert.deepEqual(row, {
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
      });
  });
})

afterEach(done => {
  knex.schema.dropTable('police_reports')
    .then(() => {
      return knex.schema.dropTable('offense_types');
    })
    .then(() => done())
    .catch((err) => {
      done(err);
    });
});
