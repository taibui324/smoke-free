exports.up = (pgm) => {
  pgm.createTable('chat_messages', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    role: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Message role: user or assistant',
    },
    content: {
      type: 'text',
      notNull: true,
    },
    metadata: {
      type: 'jsonb',
      notNull: false,
      comment: 'Additional metadata like tokens used, model, etc.',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create indexes
  pgm.createIndex('chat_messages', 'user_id');
  pgm.createIndex('chat_messages', 'created_at');
  pgm.createIndex('chat_messages', ['user_id', 'created_at']);

  // Add check constraint for role
  pgm.addConstraint('chat_messages', 'chat_messages_role_check', {
    check: "role IN ('user', 'assistant', 'system')",
  });
};

exports.down = (pgm) => {
  pgm.dropTable('chat_messages');
};
