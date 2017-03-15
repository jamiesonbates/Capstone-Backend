'use strict';

exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments();
    table
      .string('email')
      .notNullable()
      .unique();
    table.string('username');
    table.string('home_lat');
    table.string('home_lng');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
