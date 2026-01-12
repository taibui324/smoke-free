exports.up = (pgm) => {
  // Create resources table
  pgm.createTable('resources', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
      notNull: true,
    },
    content: {
      type: 'text',
      notNull: false,
      comment: 'Full content for articles',
    },
    type: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Type: article, video, tip',
    },
    category: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Category: health_benefits, coping_strategies, success_stories, etc.',
    },
    url: {
      type: 'text',
      notNull: false,
      comment: 'URL for videos or external content',
    },
    reading_time_minutes: {
      type: 'integer',
      notNull: false,
      comment: 'Estimated reading time for articles',
    },
    tags: {
      type: 'text[]',
      notNull: false,
      default: pgm.func("'{}'"),
    },
    is_featured: {
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

  // Create user_bookmarks table
  pgm.createTable('user_bookmarks', {
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
    resource_id: {
      type: 'uuid',
      notNull: true,
      references: 'resources',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create indexes
  pgm.createIndex('resources', 'type');
  pgm.createIndex('resources', 'category');
  pgm.createIndex('resources', 'is_featured');
  pgm.createIndex('resources', 'created_at');
  pgm.createIndex('user_bookmarks', 'user_id');
  pgm.createIndex('user_bookmarks', 'resource_id');
  pgm.createIndex('user_bookmarks', ['user_id', 'resource_id'], { unique: true });

  // Add check constraints
  pgm.addConstraint('resources', 'resources_type_check', {
    check: "type IN ('article', 'video', 'tip')",
  });

  // Seed initial resources
  pgm.sql(`
    INSERT INTO resources (title, description, content, type, category, reading_time_minutes, tags, is_featured) VALUES
    -- Health Benefits
    ('20 Minutes After Quitting', 'Your heart rate and blood pressure begin to drop to normal levels', 
     'Within just 20 minutes of your last cigarette, your body begins to heal. Your heart rate drops to a more normal level, and your blood pressure begins to decrease. This is the first of many positive changes your body will experience.', 
     'article', 'health_benefits', 2, ARRAY['health', 'timeline', 'benefits'], true),
    
    ('12 Hours: Carbon Monoxide Normalizes', 'Carbon monoxide level in your blood drops to normal', 
     'After 12 hours without smoking, the carbon monoxide level in your blood drops to normal. This allows your blood to carry more oxygen to your organs and tissues, improving your overall health.', 
     'article', 'health_benefits', 2, ARRAY['health', 'timeline'], false),
    
    ('2 Weeks: Circulation Improves', 'Your circulation improves and lung function increases', 
     'Within 2 weeks to 3 months after quitting, your circulation improves and your lung function increases. You may notice you can exercise more easily and breathe better.', 
     'article', 'health_benefits', 3, ARRAY['health', 'timeline', 'exercise'], true),
    
    -- Coping Strategies
    ('Deep Breathing Exercise', 'A simple technique to manage cravings', 
     'When a craving hits, try this: Breathe in slowly through your nose for 4 counts, hold for 4 counts, then exhale slowly through your mouth for 6 counts. Repeat 5 times. This activates your body''s relaxation response.', 
     'article', 'coping_strategies', 3, ARRAY['coping', 'breathing', 'techniques'], true),
    
    ('The 5 D''s of Quitting', 'Five strategies to overcome cravings', 
     'Remember the 5 D''s: Delay (wait 5 minutes), Distract (do something else), Drink water, Deep breathe, and Discuss (talk to someone). These simple strategies can help you get through any craving.', 
     'article', 'coping_strategies', 4, ARRAY['coping', 'strategies', 'techniques'], true),
    
    ('Exercise as a Quit Tool', 'How physical activity helps you quit', 
     'Exercise is one of the most effective tools for quitting smoking. It reduces cravings, improves mood, and helps manage weight. Even a 5-minute walk can make a craving pass.', 
     'article', 'coping_strategies', 5, ARRAY['exercise', 'coping', 'health'], false),
    
    -- Success Stories
    ('Sarah''s Journey: 1 Year Smoke-Free', 'How Sarah quit after 15 years of smoking', 
     'Sarah smoked for 15 years before deciding to quit. She shares her story of struggles, victories, and the strategies that helped her succeed. "The first week was the hardest, but it got easier every day."', 
     'article', 'success_stories', 6, ARRAY['inspiration', 'success', 'motivation'], true),
    
    -- Tips
    ('Avoid Your Triggers', 'Identify and avoid situations that make you want to smoke', 
     'Common triggers include coffee, alcohol, stress, and certain social situations. Identify your triggers and plan how to avoid or handle them differently.', 
     'tip', 'coping_strategies', 1, ARRAY['tips', 'triggers', 'coping'], false),
    
    ('Stay Hydrated', 'Drinking water helps reduce cravings', 
     'Drinking water can help reduce cravings and flush nicotine from your system faster. Aim for 8 glasses a day.', 
     'tip', 'health_benefits', 1, ARRAY['tips', 'health', 'hydration'], false),
    
    ('Celebrate Small Wins', 'Every smoke-free day is a victory', 
     'Don''t wait for big milestones. Celebrate each smoke-free day, each craving you overcome, and each dollar you save. Small wins add up to big success.', 
     'tip', 'motivation', 1, ARRAY['tips', 'motivation', 'success'], false)
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('user_bookmarks');
  pgm.dropTable('resources');
};
