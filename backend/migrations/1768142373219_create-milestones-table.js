exports.up = (pgm) => {
  // Create milestones table for predefined milestones
  pgm.createTable('milestones', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    description: {
      type: 'text',
      notNull: true,
    },
    duration_hours: {
      type: 'integer',
      notNull: true,
      comment: 'Hours after quit date to unlock this milestone',
    },
    category: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Category: time, health, savings, or achievement',
    },
    icon: {
      type: 'varchar(50)',
      notNull: false,
      comment: 'Icon identifier for the milestone',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create user_milestones table to track user progress
  pgm.createTable('user_milestones', {
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
    milestone_id: {
      type: 'uuid',
      notNull: true,
      references: 'milestones',
      onDelete: 'CASCADE',
    },
    unlocked_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    shared: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether user has shared this milestone',
    },
  });

  // Create indexes
  pgm.createIndex('user_milestones', 'user_id');
  pgm.createIndex('user_milestones', 'milestone_id');
  pgm.createIndex('user_milestones', ['user_id', 'milestone_id'], { unique: true });
  pgm.createIndex('milestones', 'duration_hours');
  pgm.createIndex('milestones', 'category');

  // Seed predefined milestones
  pgm.sql(`
    INSERT INTO milestones (name, description, duration_hours, category, icon) VALUES
    -- Time-based milestones
    ('20 Minutes Smoke-Free', 'Your heart rate and blood pressure begin to drop to normal levels', 0.33, 'health', 'heart'),
    ('8 Hours Smoke-Free', 'Carbon monoxide level in your blood drops to normal', 8, 'health', 'lungs'),
    ('24 Hours Smoke-Free', 'Your risk of heart attack begins to decrease', 24, 'time', 'trophy'),
    ('48 Hours Smoke-Free', 'Nerve endings start to regrow, improving taste and smell', 48, 'health', 'nose'),
    ('72 Hours Smoke-Free', 'Breathing becomes easier as bronchial tubes relax', 72, 'health', 'wind'),
    ('1 Week Smoke-Free', 'You''ve made it through the hardest week!', 168, 'time', 'star'),
    ('2 Weeks Smoke-Free', 'Circulation improves and lung function increases', 336, 'health', 'heart-pulse'),
    ('1 Month Smoke-Free', 'Coughing and shortness of breath decrease significantly', 720, 'time', 'medal'),
    ('3 Months Smoke-Free', 'Lung function continues to improve', 2160, 'time', 'award'),
    ('6 Months Smoke-Free', 'Coughing, sinus congestion, and fatigue decrease', 4320, 'time', 'crown'),
    ('1 Year Smoke-Free', 'Your risk of heart disease is half that of a smoker', 8760, 'time', 'diamond'),
    
    -- Achievement milestones
    ('First Craving Logged', 'You''ve taken the first step in tracking your cravings', 0, 'achievement', 'clipboard'),
    ('10 Cravings Overcome', 'You''ve successfully managed 10 cravings', 0, 'achievement', 'shield'),
    ('50 Cravings Overcome', 'You''ve successfully managed 50 cravings', 0, 'achievement', 'shield-check'),
    ('100 Cravings Overcome', 'You''ve successfully managed 100 cravings', 0, 'achievement', 'shield-star'),
    
    -- Savings milestones
    ('$50 Saved', 'You''ve saved your first $50 by not smoking', 0, 'savings', 'dollar'),
    ('$100 Saved', 'You''ve saved $100 by not smoking', 0, 'savings', 'dollar'),
    ('$500 Saved', 'You''ve saved $500 by not smoking', 0, 'savings', 'piggy-bank'),
    ('$1000 Saved', 'You''ve saved $1000 by not smoking', 0, 'savings', 'money-bag')
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('user_milestones');
  pgm.dropTable('milestones');
};
