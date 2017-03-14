'use strict';

const reportsForTestDB = require('../test/testdata/reportsForTestDB');

exports.seed = function(knex) {
  return knex('police_reports').del()
    .then(() => {
      return knex('police_reports')
        .insert(reportsForTestDB)
    })
    .then(() => {
      return knex.raw("SELECT setval('police_reports_id_seq', (SELECT MAX(id) FROM police_reports));");
    })
    .catch((err) => {
      console.error(err);
    })
};