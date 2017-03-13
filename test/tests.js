'use strict';

process.env.NODE_ENV = 'test';

// Dependencies
const assert = require('chai').assert;
const { camelizeKeys, decamelizeKeys } = require('humps');
const knex = require('../knex');
const { suite, test } = require('mocha');

// Functions
const {
  getPoliceReports,
  filterReports,
  getDataWithinDateRange
} = require('../bots/updateDatabase');

// Data
const sampleResponse = require('./testdata/sampleResponse');
const crimeDictionary = require('./testdata/crimeDictionary');
const filteredResults = require('./testdata/filteredResults');
const reportsForTestDB = require('./testdata/reportsForTestDB');

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
      table.integer('offense_code');
      table.integer('offense_code_extension');
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

suite('filterReports function', () => {
  test('takes in array of objects and filters based on dictionary', (done) => {
    const results = filterReports(sampleResponse);

    assert.deepEqual(results, filteredResults);
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
