'use strict';

exports.up = function(knex) {
  return knex.schema.createTable('alerts', (table) => {
    table.increments();
    table
      .integer('user_id')
      .references('id')
      .inTable('users')
      .notNullable()
      .index();
    table
      .integer('offense_type_id')
      .references('id')
      .inTable('offense_types')
      .notNullable()
      .index();
    table
      .integer('range')
      .notNullable()
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('alerts');
};
