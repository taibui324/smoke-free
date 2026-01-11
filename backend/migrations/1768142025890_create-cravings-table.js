/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('cravings', {
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
    },
    intensity: {
      type: 'integer',
      notNull: true,
      check: 'intensity >= 1 AND intensity <= 10',
    },
    triggers: {
      type: 'text[]',
      notNull: true,
      default: '{}',
    },
    relief_techniques_used: {
      type: 'text[]',
      notNull: false,
      default: '{}',
    },
    duration: {
      type: 'integer',
      notNull: false,
      comment: 'Duration in seconds until craving passed',
    },
    notes: {
      type: 'text',
      notNull: false,
    },
    resolved: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('cravings', 'user_id');
  pgm.createIndex('cravings', 'created_at');
  pgm.createIndex('cravings', ['user_id', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('cravings');
};
