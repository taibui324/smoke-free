import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { authService } from '../services/auth.service';

describe('Milestone Controller', () => {
  let testUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Clean up and create test user
    await pool.query('DELETE FROM users WHERE email = $1', ['milestone-test@example.com']);

    const { user, tokens } = await authService.registerUser({
      email: 'milestone-test@example.com',
      password: 'TestPassword123!',
    });

    testUserId = user.id;
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['milestone-test@example.com']);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up quit plans and user milestones after each test
    await pool.query('DELETE FROM quit_plans WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM user_milestones WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM cravings WHERE user_id = $1', [testUserId]);
  });

  describe('GET /api/progress/milestones', () => {
    it('should return empty array when no quit plan exists', async () => {
      const response = await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return milestone progress for user with quit plan', async () => {
      // Create quit plan with quit date 1 day ago
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 1);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check structure of milestone progress
      const firstMilestone = response.body.data[0];
      expect(firstMilestone).toHaveProperty('milestone');
      expect(firstMilestone).toHaveProperty('unlocked');
      expect(firstMilestone).toHaveProperty('progress');
      expect(firstMilestone.milestone).toHaveProperty('name');
      expect(firstMilestone.milestone).toHaveProperty('description');
      expect(firstMilestone.milestone).toHaveProperty('category');
    });

    it('should unlock 24-hour milestone after 1 day', async () => {
      // Create quit plan with quit date 25 hours ago
      const quitDate = new Date();
      quitDate.setHours(quitDate.getHours() - 25);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Find 24-hour milestone
      const milestone24h = response.body.data.find(
        (m: any) => m.milestone.name === '24 Hours Smoke-Free'
      );

      expect(milestone24h).toBeDefined();
      expect(milestone24h.progress).toBe(100);
      expect(milestone24h.unlocked).toBe(true);
    });

    it('should show progress for upcoming milestones', async () => {
      // Create quit plan with quit date 12 hours ago
      const quitDate = new Date();
      quitDate.setHours(quitDate.getHours() - 12);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Find 24-hour milestone
      const milestone24h = response.body.data.find(
        (m: any) => m.milestone.name === '24 Hours Smoke-Free'
      );

      expect(milestone24h).toBeDefined();
      expect(milestone24h.progress).toBeGreaterThan(0);
      expect(milestone24h.progress).toBeLessThan(100);
      expect(milestone24h.unlocked).toBe(false);
      expect(milestone24h.timeRemaining).toBeDefined();
      expect(milestone24h.timeRemaining.hours).toBeGreaterThan(0);
    });

    it('should unlock achievement milestone for first craving', async () => {
      // Create quit plan
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 1);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      // Create a resolved craving
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers, resolved)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, 5, ['stress'], true]
      );

      const response = await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Find first craving milestone
      const firstCravingMilestone = response.body.data.find(
        (m: any) => m.milestone.name === 'First Craving Logged'
      );

      expect(firstCravingMilestone).toBeDefined();
      expect(firstCravingMilestone.progress).toBe(100);
      expect(firstCravingMilestone.unlocked).toBe(true);
    });

    it('should show progress for 10 cravings milestone', async () => {
      // Create quit plan
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 1);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      // Create 5 resolved cravings
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO cravings (user_id, intensity, triggers, resolved)
           VALUES ($1, $2, $3, $4)`,
          [testUserId, 5, ['stress'], true]
        );
      }

      const response = await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Find 10 cravings milestone
      const cravingMilestone = response.body.data.find(
        (m: any) => m.milestone.name === '10 Cravings Overcome'
      );

      expect(cravingMilestone).toBeDefined();
      expect(cravingMilestone.progress).toBe(50); // 5 out of 10
      expect(cravingMilestone.unlocked).toBe(false);
    });

    it('should unlock savings milestone when threshold reached', async () => {
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
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Find $50 and $100 savings milestones
      const milestone50 = response.body.data.find((m: any) => m.milestone.name === '$50 Saved');
      const milestone100 = response.body.data.find((m: any) => m.milestone.name === '$100 Saved');

      expect(milestone50).toBeDefined();
      expect(milestone50.progress).toBe(100);
      expect(milestone50.unlocked).toBe(true);

      expect(milestone100).toBeDefined();
      expect(milestone100.progress).toBeGreaterThanOrEqual(100);
      expect(milestone100.unlocked).toBe(true);
    });

    it('should show progress for savings milestones', async () => {
      // Create quit plan with quit date 3 days ago
      // 20 cigarettes/day, $10/pack, 20 cigarettes/pack = $10/day
      // 3 days * $10 = $30
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 3);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Find $50 savings milestone
      const milestone50 = response.body.data.find((m: any) => m.milestone.name === '$50 Saved');

      expect(milestone50).toBeDefined();
      expect(milestone50.progress).toBeGreaterThan(50); // Around 60%
      expect(milestone50.progress).toBeLessThan(100);
      expect(milestone50.unlocked).toBe(false);
    });

    it('should include all milestone categories', async () => {
      // Create quit plan
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 1);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const categories = new Set(response.body.data.map((m: any) => m.milestone.category));

      expect(categories.has('time')).toBe(true);
      expect(categories.has('health')).toBe(true);
      expect(categories.has('achievement')).toBe(true);
      expect(categories.has('savings')).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/progress/milestones').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/progress/milestones/unlocked', () => {
    it('should return empty array when no milestones unlocked', async () => {
      const response = await request(app)
        .get('/api/progress/milestones/unlocked')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return unlocked milestones', async () => {
      // Create quit plan with quit date 2 days ago
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 2);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      // Trigger milestone check
      await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`);

      // Get unlocked milestones
      const response = await request(app)
        .get('/api/progress/milestones/unlocked')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check structure
      const firstMilestone = response.body.data[0];
      expect(firstMilestone).toHaveProperty('id');
      expect(firstMilestone).toHaveProperty('userId');
      expect(firstMilestone).toHaveProperty('milestoneId');
      expect(firstMilestone).toHaveProperty('unlockedAt');
      expect(firstMilestone).toHaveProperty('shared');
      expect(firstMilestone).toHaveProperty('milestone');
    });

    it('should return milestones in descending order by unlock date', async () => {
      // Create quit plan with quit date 2 days ago
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 2);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      // Trigger milestone check
      await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`);

      // Get unlocked milestones
      const response = await request(app)
        .get('/api/progress/milestones/unlocked')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      if (response.body.data.length > 1) {
        const dates = response.body.data.map((m: any) => new Date(m.unlockedAt).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
        }
      }
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/progress/milestones/unlocked').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/progress/milestone/:id/share', () => {
    it('should mark milestone as shared', async () => {
      // Create quit plan and unlock a milestone
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 2);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      // Trigger milestone check
      await request(app)
        .get('/api/progress/milestones')
        .set('Authorization', `Bearer ${accessToken}`);

      // Get an unlocked milestone
      const unlockedResponse = await request(app)
        .get('/api/progress/milestones/unlocked')
        .set('Authorization', `Bearer ${accessToken}`);

      const milestoneId = unlockedResponse.body.data[0].milestoneId;

      // Share the milestone
      const response = await request(app)
        .post(`/api/progress/milestone/${milestoneId}/share`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's marked as shared
      const verifyResponse = await request(app)
        .get('/api/progress/milestones/unlocked')
        .set('Authorization', `Bearer ${accessToken}`);

      const sharedMilestone = verifyResponse.body.data.find(
        (m: any) => m.milestoneId === milestoneId
      );
      expect(sharedMilestone.shared).toBe(true);
    });

    it('should return 404 for non-existent milestone', async () => {
      const response = await request(app)
        .post('/api/progress/milestone/00000000-0000-0000-0000-000000000000/share')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('MILESTONE_NOT_FOUND');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/progress/milestone/00000000-0000-0000-0000-000000000000/share')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/progress/streak', () => {
    it('should return 0 streak when no quit plan exists', async () => {
      const response = await request(app)
        .get('/api/progress/streak')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bestStreak).toBe(0);
    });

    it('should return current streak as best streak', async () => {
      // Create quit plan with quit date 5 days ago
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 5);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .get('/api/progress/streak')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bestStreak).toBeGreaterThanOrEqual(5);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/progress/streak').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
