/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'text',
      notNull: true,
    },
    first_name: {
      type: 'varchar(100)',
      notNull: false,
    },
    last_name: {
      type: 'varchar(100)',
      notNull: false,
    },
    profile_picture_url: {
      type: 'text',
      notNull: false,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
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
    last_login_at: {
      type: 'timestamp',
      notNull: false,
    },
  });

  pgm.createIndex('users', 'email');

  pgm.createTable('user_preferences', {
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
    notifications_enabled: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    daily_check_in_time: {
      type: 'varchar(5)',
      notNull: false,
    },
    craving_alerts_enabled: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    ai_chatbot_tone: {
      type: 'varchar(20)',
      notNull: true,
      default: 'empathetic',
    },
    language: {
      type: 'varchar(10)',
      notNull: true,
      default: 'en',
    },
    theme: {
      type: 'varchar(10)',
      notNull: true,
      default: 'auto',
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

  pgm.createIndex('user_preferences', 'user_id', { unique: true });
};

exports.down = pgm => {
  pgm.dropTable('user_preferences');
  pgm.dropTable('users');
  pgm.dropExtension('uuid-ossp');
};
