import { pool } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Development seed script
 * Seeds the database with sample data for development and testing
 */
export async function seedDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Starting database seeding...');

    // Add seed data here as tables are created
    // Example:
    // await client.query(`
    //   INSERT INTO users (email, password_hash, first_name, last_name)
    //   VALUES ($1, $2, $3, $4)
    //   ON CONFLICT (email) DO NOTHING
    // `, ['test@example.com', 'hashed_password', 'Test', 'User']);

    await client.query('COMMIT');
    logger.info('Database seeding completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database seeding failed', { error });
    throw error;
  } finally {
    client.release();
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed script failed', { error });
      process.exit(1);
    });
}
