exports.up = (pgm) => {
  // Create community_posts table
  pgm.createTable('community_posts', {
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
    content: {
      type: 'text',
      notNull: true,
    },
    post_type: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Type: milestone, support, success_story',
    },
    milestone_id: {
      type: 'uuid',
      notNull: false,
      references: 'milestones',
      onDelete: 'SET NULL',
      comment: 'Reference to milestone if post is about milestone achievement',
    },
    is_anonymous: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    likes_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    comments_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    is_flagged: {
      type: 'boolean',
      notNull: true,
      default: false,
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

  // Create post_likes table
  pgm.createTable('post_likes', {
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
    post_id: {
      type: 'uuid',
      notNull: true,
      references: 'community_posts',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create post_comments table
  pgm.createTable('post_comments', {
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
    post_id: {
      type: 'uuid',
      notNull: true,
      references: 'community_posts',
      onDelete: 'CASCADE',
    },
    content: {
      type: 'text',
      notNull: true,
    },
    is_anonymous: {
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

  // Create user_blocks table
  pgm.createTable('user_blocks', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    blocker_user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
      comment: 'User who is blocking',
    },
    blocked_user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
      comment: 'User who is being blocked',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create content_reports table
  pgm.createTable('content_reports', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    reporter_user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    post_id: {
      type: 'uuid',
      notNull: false,
      references: 'community_posts',
      onDelete: 'CASCADE',
    },
    comment_id: {
      type: 'uuid',
      notNull: false,
      references: 'post_comments',
      onDelete: 'CASCADE',
    },
    reason: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Reason: spam, harassment, inappropriate, other',
    },
    description: {
      type: 'text',
      notNull: false,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
      comment: 'Status: pending, reviewed, action_taken, dismissed',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    reviewed_at: {
      type: 'timestamp',
      notNull: false,
    },
  });

  // Create indexes
  pgm.createIndex('community_posts', 'user_id');
  pgm.createIndex('community_posts', 'post_type');
  pgm.createIndex('community_posts', 'created_at');
  pgm.createIndex('community_posts', 'is_flagged');
  
  pgm.createIndex('post_likes', 'user_id');
  pgm.createIndex('post_likes', 'post_id');
  pgm.createIndex('post_likes', ['user_id', 'post_id'], { unique: true });
  
  pgm.createIndex('post_comments', 'user_id');
  pgm.createIndex('post_comments', 'post_id');
  pgm.createIndex('post_comments', 'created_at');
  
  pgm.createIndex('user_blocks', 'blocker_user_id');
  pgm.createIndex('user_blocks', 'blocked_user_id');
  pgm.createIndex('user_blocks', ['blocker_user_id', 'blocked_user_id'], { unique: true });
  
  pgm.createIndex('content_reports', 'reporter_user_id');
  pgm.createIndex('content_reports', 'post_id');
  pgm.createIndex('content_reports', 'comment_id');
  pgm.createIndex('content_reports', 'status');

  // Add check constraints
  pgm.addConstraint('community_posts', 'community_posts_type_check', {
    check: "post_type IN ('milestone', 'support', 'success_story')",
  });

  pgm.addConstraint('content_reports', 'content_reports_reason_check', {
    check: "reason IN ('spam', 'harassment', 'inappropriate', 'other')",
  });

  pgm.addConstraint('content_reports', 'content_reports_status_check', {
    check: "status IN ('pending', 'reviewed', 'action_taken', 'dismissed')",
  });

  // Ensure at least one of post_id or comment_id is set
  pgm.addConstraint('content_reports', 'content_reports_target_check', {
    check: '(post_id IS NOT NULL) OR (comment_id IS NOT NULL)',
  });

  // Prevent self-blocking
  pgm.addConstraint('user_blocks', 'user_blocks_no_self_block', {
    check: 'blocker_user_id != blocked_user_id',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('content_reports');
  pgm.dropTable('user_blocks');
  pgm.dropTable('post_comments');
  pgm.dropTable('post_likes');
  pgm.dropTable('community_posts');
};
