exports.up = (pgm) => {
  pgm.addColumns('users', {
    password_reset_token: {
      type: 'text',
      notNull: false,
    },
    password_reset_expires: {
      type: 'timestamp',
      notNull: false,
    },
  });

  pgm.createIndex('users', 'password_reset_expires');
};

exports.down = (pgm) => {
  pgm.dropIndex('users', 'password_reset_expires');
  pgm.dropColumns('users', ['password_reset_token', 'password_reset_expires']);
};
