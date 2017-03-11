'use strict';

exports.up = function(knex) {
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
    table.integer('specific_offense_type');
    table.string('date_reported');
    table.string('date_occured');
    table
      .integer('latitude')
      .notNullable();
    table
      .integer('longitude')
      .notNullable();
    table.string('hundred_block');
    table.string('district_sector');
    table.string('zone_beat');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('police_reports');
};
