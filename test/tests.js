'use strict';

// Dependencies
const assert = require('chai').assert;
const knex = require('../knex');
const { suite, test } = require('mocha');

// Functions
const { getPoliceReports, filterReports } = require('../bots/updateDatabase');

// Data
const sampleResponse = require('./testdata/sampleResponse');
const crimeDictionary = require('./testdata/crimeDictionary');
const filteredResults = require('./testdata/filteredResults');

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
