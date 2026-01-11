import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { authService } from '../services/auth.service';

describe('Statistics Controller', () => {
  let testUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Clean up and create test user
    await pool.query('DELETE FROM users WHERE email = $1', ['stats-test@example.com']);

    const { user, tokens } = await authService.registerUser({
      email: 'stats-test@example.com',
      password: 'TestPassword123!',
    });

    testUserId = user.id;
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['stats-test@example.com']);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up quit plans after each test
    await pool.query('DELETE FROM quit_plans WHERE user_id = $1', [testUserId]);
  });

  describe('GET /api/progress/stats', () => {
    it('should return 404 if no quit plan exists', async () => {
      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('QUIT_PLAN_NOT_FOUND');
    });

    it('should return statistics for user with quit plan', async () => {
      // Create quit plan with quit date 7 days ago (directly in database to bypass validation)
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 7);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('smokeFreeTime');
      expect(response.body.data).toHaveProperty('moneySaved');
      expect(response.body.data).toHaveProperty('cigarettesNotSmoked');
      expect(response.body.data).toHaveProperty('lifeRegained');
      expect(response.body.data).toHaveProperty('currentStreak');
      expect(response.body.data).toHaveProperty('quitDate');
    });

    it('should calculate smoke-free time correctly', async () => {
      // Create quit plan with quit date 2 days ago
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 2);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const smokeFreeTime = response.body.data.smokeFreeTime;
      expect(smokeFreeTime.totalDays).toBeGreaterThanOrEqual(2);
      expect(smokeFreeTime.days).toBeGreaterThanOrEqual(2);
      expect(smokeFreeTime).toHaveProperty('hours');
      expect(smokeFreeTime).toHaveProperty('minutes');
      expect(smokeFreeTime).toHaveProperty('seconds');
    });

    it('should calculate money saved correctly', async () => {
      // Create quit plan with quit date 10 days ago
      // 20 cigarettes/day, $10/pack, 20 cigarettes/pack = $10/day
      // 10 days * $10 = $100
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 10);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const moneySaved = response.body.data.moneySaved;
      expect(moneySaved).toBeGreaterThanOrEqual(100);
      expect(moneySaved).toBeLessThan(110); // Account for partial day
    });

    it('should calculate cigarettes not smoked correctly', async () => {
      // Create quit plan with quit date 5 days ago
      // 20 cigarettes/day * 5 days = 100 cigarettes
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 5);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const cigarettesNotSmoked = response.body.data.cigarettesNotSmoked;
      expect(cigarettesNotSmoked).toBeGreaterThanOrEqual(100);
      expect(cigarettesNotSmoked).toBeLessThan(110); // Account for partial day
    });

    it('should calculate life regained correctly', async () => {
      // Create quit plan with quit date 1 day ago
      // 20 cigarettes * 11 minutes = 220 minutes
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 1);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const lifeRegained = response.body.data.lifeRegained;
      expect(lifeRegained).toHaveProperty('minutes');
      expect(lifeRegained).toHaveProperty('hours');
      expect(lifeRegained).toHaveProperty('days');
      expect(lifeRegained.minutes).toBeGreaterThanOrEqual(220);
    });

    it('should calculate current streak correctly', async () => {
      // Create quit plan with quit date 3 days ago
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 3);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const currentStreak = response.body.data.currentStreak;
      expect(currentStreak).toBeGreaterThanOrEqual(3);
    });

    it('should return zeros for future quit date', async () => {
      // Create quit plan with quit date in the future
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() + 1);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const smokeFreeTime = response.body.data.smokeFreeTime;
      expect(smokeFreeTime.days).toBe(0);
      expect(smokeFreeTime.hours).toBe(0);
      expect(smokeFreeTime.minutes).toBe(0);
      expect(smokeFreeTime.seconds).toBe(0);
      expect(response.body.data.moneySaved).toBe(0);
      expect(response.body.data.cigarettesNotSmoked).toBe(0);
    });

    it('should handle different cigarettes per pack', async () => {
      // Create quit plan with 25 cigarettes per pack
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 5);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 25, 12, 25, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 25 cigarettes/day, 25 per pack = 1 pack/day
      // 1 pack * $12 = $12/day
      // 5 days * $12 = $60
      const moneySaved = response.body.data.moneySaved;
      expect(moneySaved).toBeGreaterThanOrEqual(60);
      expect(moneySaved).toBeLessThan(65);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/progress/stats').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/progress/timer', () => {
    it('should return 404 if no quit plan exists', async () => {
      const response = await request(app)
        .get('/api/progress/timer')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('QUIT_PLAN_NOT_FOUND');
    });

    it('should return smoke-free timer', async () => {
      // Create quit plan with quit date 1 day ago
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 1);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/timer')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('smokeFreeTime');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.smokeFreeTime).toHaveProperty('days');
      expect(response.body.data.smokeFreeTime).toHaveProperty('hours');
      expect(response.body.data.smokeFreeTime).toHaveProperty('minutes');
      expect(response.body.data.smokeFreeTime).toHaveProperty('seconds');
    });

    it('should return current timestamp', async () => {
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 1);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const beforeRequest = new Date();
      const response = await request(app)
        .get('/api/progress/timer')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const afterRequest = new Date();

      const timestamp = new Date(response.body.data.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
    });

    it('should update timer values on subsequent requests', async () => {
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 1);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response1 = await request(app)
        .get('/api/progress/timer')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response2 = await request(app)
        .get('/api/progress/timer')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const seconds1 = response1.body.data.smokeFreeTime.totalSeconds;
      const seconds2 = response2.body.data.smokeFreeTime.totalSeconds;

      expect(seconds2).toBeGreaterThanOrEqual(seconds1 + 2);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/progress/timer').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
