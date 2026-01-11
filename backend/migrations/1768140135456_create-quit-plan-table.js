/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('quit_plans', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
      unique: true, // One quit plan per user
    },
    quit_date: {
      type: 'timestamp',
      notNull: true,
    },
    cigarettes_per_day: {
      type: 'integer',
      notNull: true,
    },
    cost_per_pack: {
      type: 'decimal(10,2)',
      notNull: true,
    },
    cigarettes_per_pack: {
      type: 'integer',
      notNull: true,
      default: 20,
    },
    motivations: {
      type: 'text[]',
      notNull: true,
      default: '{}',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('quit_plans', 'user_id', { unique: true });
  pgm.createIndex('quit_plans', 'quit_date');
};

exports.down = (pgm) => {
  pgm.dropTable('quit_plans');
};
