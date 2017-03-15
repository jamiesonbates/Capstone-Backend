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
  deleteOldReports,
  prepareDataForConsumption,
  getDataWithinDateRange,
  removeDuplicateReports,
  identifyNewDataAndInsert,
  identifyAlteredData,
  updateAlteredData
} = require('../bots/updateDatabase');

const {
  sendAlertsJob,
  getAllAlerts,
  checkForMatches,
  sendAlertsFromMatches
} = require('../bots/sendAlerts');

// Data
const sampleResponse = require('./testdata/sampleResponse');
const crimeDictionary = require('./testdata/crimeDictionary');
const filteredResults = require('./testdata/filteredResults');
const reportsWithNewData = require('./testdata/reportsWithNewData');
const reportsWithUpdatedData = require('./testdata/reportsWithUpdatedData');

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
    getPoliceReports(1)
      .then((results) => {
        delete results[0].occurred_date_range_end;
        delete sampleResponse[0].occurred_date_range_end;
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
    getDataWithinDateRange(1)
      .then((results) => {
        assert.deepEqual(results.length, 9);
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
            .where('general_offense_number', 201779999)
            .first()
        })
        .then((row) => {
          delete row.id;
          delete row.created_at;
          delete row.updated_at;
          delete row.date_occurred;
          delete row.date_reported;
          delete row.location;

          row.latitude = parseFloat(row.latitude);
          row.longitude = parseFloat(row.longitude);

          assert.deepEqual(row, {
            general_offense_number: '201779999',
            offense_type_id: 1,
            specific_offense_code: 2404,
            specific_offense_code_extension: 1,
            specific_offense_type: 'VEH-THEFT-AUTO',
            longitude: -122.387863159,
            latitude: 47.581176758,
            hundred_block: '44 AV SW / SW ADMIRAL WY',
            district_sector: 'W',
            zone_beat: 'W1'
          });

          done();
        })
        .catch((err) => {
          console.error(err);
        })
  })
});

suite('identifyAlteredDataAndUpdate', () => {
  test('function should update rows where data has changed', (done) => {
    getDataWithinDateRange(1)
      .then((data) => {
        return identifyAlteredData(reportsWithUpdatedData, data);
      })
      .then((data) => {
        const res = [];

        for (const report of data) {
          res.push(updateAlteredData(report));
        }

        return Promise.all(res);
      })
      .then(() => {
        knex('police_reports').whereIn('general_offense_number', [201773977, 201774471])
          .then((data) => {
            delete data[0].id;
            delete data[1].id;
            delete data[0].created_at;
            delete data[0].updated_at;
            delete data[1].created_at;
            delete data[1].updated_at;

            // Delete pending fix for test data?
            delete data[0].date_occurred;
            delete data[1].date_occurred;
            delete data[0].date_reported;
            delete data[1].date_reported;

            data[0].latitude = parseFloat(data[0].latitude);
            data[0].longitude = parseFloat(data[0].longitude);
            data[1].latitude = parseFloat(data[1].latitude);
            data[1].longitude = parseFloat(data[1].longitude);
            delete data[0].location;
            delete data[1].location;

            assert.deepEqual(JSON.stringify(data[0]), JSON.stringify({
              // date_reported: '2017-03-01T11:25:00.000',
              general_offense_number: '201773977',
              offense_type_id: 1,
              specific_offense_code: 2404,
              specific_offense_code_extension: 1,
              specific_offense_type: 'VEH-THEFT-AUTO',
              longitude: -122.387863159,
              latitude: 47.581176758,
              hundred_block: '44 AV NW / SW ADMIRAL WY',
              district_sector: 'W',
              // date_occurred: '2017-02-28T21:00:00.000',
              zone_beat: 'W1'
            }));
            assert.deepEqual(JSON.stringify(data[1]), JSON.stringify({
              // date_reported: '2017-03-01T17:33:00.000',
              general_offense_number: '201774471',
              offense_type_id: 1,
              specific_offense_code: 2404,
              specific_offense_code_extension: 1,
              specific_offense_type: 'VEH-THEFT-AUTO',
              longitude: -122.37664032,
              latitude: 47.528282166,
              hundred_block: '35 AVE SW / SW THISTLE ST',
              district_sector: 'F',
              // date_occurred: '2017-03-01T06:40:00.000',
              zone_beat: 'F2'
            }));
            done();
          })
          .catch((err) => {
            done(err);
          });
      });
  });
});

suite('deleteOldReports function', () => {
  test('should delete reports older than 1 year from the DB', (done) => {
    deleteOldReports()
      .then(() => {
        return knex('police_reports').where('general_offense_number', 201739380);
      })
      .then((row) => {
        assert.lengthOf(row, 0);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});

suite('test geography type given by postgis', () => {
  test('should return subset of data based on distance away', (done) => {
    knex.raw(`
      SELECT * FROM police_reports WHERE ST_DWithin(police_reports.location, ST_POINT(-122.387863159, 47.581176758), 10000);
    `)
    .then((data) => {
      assert.deepEqual(data.rows.length, 10);
      done()
    })
    .catch((err) => {
      done(err);
    })
  });
});

suite('getAllAlerts function', () => {
  test('each result has user information', (done) => {
    getAllAlerts()
      .then((data) => {
        delete data[0].created_at;
        delete data[0].updated_at;

        const dataKeys = Object.keys(data[0]);
        const expectedKeys = ['id', 'user_id', 'offense_type_id', 'range', 'email', 'username', 'home_lat', 'home_lng']

        assert.deepEqual(dataKeys, expectedKeys);
        done()
      })
      .catch((err) => {
        done(err);
      });
  });

  test('should return 12 results', (done) => {
    getAllAlerts()
      .then((data) => {
        assert.deepEqual(data.length, 12);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});

suite('checkForMatches function', () => {
  test('should find matches for a given location', (done) => {
    getAllAlerts()
      .then((data) => {
        const res = [];

        for (const report of data) {
          res.push(checkForMatches(report));
        }
        console.log(res);
        return Promise.all(res);
      })
      .then((data) => {
        console.log(data);
        assert.deepEqual(JSON.stringify(data[1].rows[0]), JSON.stringify({
          id: 7,
          general_offense_number: '201776304',
          offense_type_id: 4,
          specific_offense_code: 3542,
          specific_offense_code_extension: 1,
          specific_offense_type: 'NARC-POSSESS-METH',
          date_reported: '2017-03-03T10:26:00.000Z',
          date_occurred: '2017-03-03T10:26:00.000Z',
          longitude: '-122.344490051',
          latitude: '47.682769775',
          location: '0101000020E6100000A20BEA5BE6945EC03274ECA012CF4740',
          hundred_block: 'AURORA AV N / WINONA AV N',
          district_sector: 'J',
          zone_beat: 'J3',
          created_at: null,
          updated_at: null
        }));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
