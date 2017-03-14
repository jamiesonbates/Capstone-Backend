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
      .onDelete('CASCADE')
      .index();
    table.integer('specific_offense_code');
    table.integer('specific_offense_code_extension');
    table.string('specific_offense_type');
    table.dateTime('date_reported', true);
    table.dateTimes('date_occurred', true);
    table
      .decimal('latitude', 11, 9)
      .notNullable();
    table
      .decimal('longitude', 12, 9)
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
