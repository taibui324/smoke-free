import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { authService } from '../services/auth.service';

describe('Quit Plan Controller', () => {
  let testUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Clean up and create test user
    await pool.query('DELETE FROM users WHERE email = $1', ['quitplan-test@example.com']);

    const { user, tokens } = await authService.registerUser({
      email: 'quitplan-test@example.com',
      password: 'TestPassword123!',
    });

    testUserId = user.id;
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['quitplan-test@example.com']);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up quit plans after each test
    await pool.query('DELETE FROM quit_plans WHERE user_id = $1', [testUserId]);
  });

  describe('POST /api/quit-plan', () => {
    it('should create quit plan with valid data', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: tomorrow.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10.5,
          cigarettesPerPack: 20,
          motivations: ['health', 'family', 'money'],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quitPlan).toHaveProperty('id');
      expect(response.body.data.quitPlan.cigarettesPerDay).toBe(20);
      expect(response.body.data.quitPlan.costPerPack).toBe(10.5);
      expect(response.body.data.quitPlan.motivations).toEqual(['health', 'family', 'money']);
      expect(response.body.data.savings).toHaveProperty('dailySavings');
      expect(response.body.data.savings).toHaveProperty('weeklySavings');
      expect(response.body.data.savings).toHaveProperty('monthlySavings');
      expect(response.body.data.savings).toHaveProperty('yearlySavings');
    });

    it('should calculate savings correctly', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: tomorrow.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10,
          cigarettesPerPack: 20,
          motivations: ['health'],
        })
        .expect(201);

      // 20 cigarettes per day / 20 per pack = 1 pack per day
      // 1 pack * $10 = $10 per day
      expect(response.body.data.savings.dailySavings).toBe(10);
      expect(response.body.data.savings.weeklySavings).toBe(70);
      expect(response.body.data.savings.monthlySavings).toBe(300);
      expect(response.body.data.savings.yearlySavings).toBe(3650);
    });

    it('should use default cigarettes per pack', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: tomorrow.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10,
          motivations: ['health'],
        })
        .expect(201);

      expect(response.body.data.quitPlan.cigarettesPerPack).toBe(20);
    });

    it('should reject quit date more than 14 days in future', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 15);

      const response = await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: farFuture.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10,
          motivations: ['health'],
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_QUIT_DATE');
      expect(response.body.error.message).toBe('Quit date must be within the next 14 days');
    });

    it('should reject quit date in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);

      const response = await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: yesterday.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10,
          motivations: ['health'],
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_QUIT_DATE');
    });

    it('should reject duplicate quit plan', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const quitPlanData = {
        quitDate: tomorrow.toISOString(),
        cigarettesPerDay: 20,
        costPerPack: 10,
        motivations: ['health'],
      };

      // Create first quit plan
      await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(quitPlanData)
        .expect(201);

      // Try to create second quit plan
      const response = await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(quitPlanData)
        .expect(409);

      expect(response.body.error.code).toBe('QUIT_PLAN_EXISTS');
    });

    it('should reject invalid cigarettes per day', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: tomorrow.toISOString(),
          cigarettesPerDay: 0,
          costPerPack: 10,
          motivations: ['health'],
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty motivations', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: tomorrow.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10,
          motivations: [],
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request without authentication', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/quit-plan')
        .send({
          quitDate: tomorrow.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10,
          motivations: ['health'],
        })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/quit-plan', () => {
    it('should get existing quit plan', async () => {
      // Create quit plan first
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: tomorrow.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10,
          motivations: ['health'],
        });

      const response = await request(app)
        .get('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quitPlan).toHaveProperty('id');
      expect(response.body.data.savings).toHaveProperty('dailySavings');
    });

    it('should return 404 if quit plan does not exist', async () => {
      const response = await request(app)
        .get('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/quit-plan').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PUT /api/quit-plan', () => {
    beforeEach(async () => {
      // Create quit plan before each test
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: tomorrow.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10,
          motivations: ['health'],
        });
    });

    it('should update quit plan', async () => {
      const response = await request(app)
        .put('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cigarettesPerDay: 30,
          costPerPack: 12,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quitPlan.cigarettesPerDay).toBe(30);
      expect(response.body.data.quitPlan.costPerPack).toBe(12);
    });

    it('should update motivations', async () => {
      const response = await request(app)
        .put('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          motivations: ['health', 'family', 'money', 'fitness'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quitPlan.motivations).toEqual([
        'health',
        'family',
        'money',
        'fitness',
      ]);
    });

    it('should recalculate savings after update', async () => {
      const response = await request(app)
        .put('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cigarettesPerDay: 40,
          costPerPack: 10,
          cigarettesPerPack: 20,
        })
        .expect(200);

      // 40 cigarettes / 20 per pack = 2 packs per day
      // 2 packs * $10 = $20 per day
      expect(response.body.data.savings.dailySavings).toBe(20);
    });

    it('should handle empty update gracefully', async () => {
      const response = await request(app)
        .put('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/quit-plan/quit-date', () => {
    beforeEach(async () => {
      // Create quit plan before each test
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/api/quit-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: tomorrow.toISOString(),
          cigarettesPerDay: 20,
          costPerPack: 10,
          motivations: ['health'],
        });
    });

    it('should update quit date', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 7);

      const response = await request(app)
        .put('/api/quit-plan/quit-date')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: newDate.toISOString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      const returnedDate = new Date(response.body.data.quitPlan.quitDate);
      expect(returnedDate.toDateString()).toBe(newDate.toDateString());
    });

    it('should reject invalid quit date', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 20);

      const response = await request(app)
        .put('/api/quit-plan/quit-date')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          quitDate: farFuture.toISOString(),
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_QUIT_DATE');
    });

    it('should reject missing quit date', async () => {
      const response = await request(app)
        .put('/api/quit-plan/quit-date')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
