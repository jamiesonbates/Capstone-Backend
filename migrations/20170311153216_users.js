'use strict';

exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments();
    table
      .string('email')
      .notNullable()
      .unique();
    table.string('username');
    table.float('home_lat');
    table.float('home_lng');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  knex.schema.dropTable('users');
};
