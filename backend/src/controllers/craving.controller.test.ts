import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { authService } from '../services/auth.service';

describe('Craving Controller', () => {
  let testUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Clean up and create test user
    await pool.query('DELETE FROM users WHERE email = $1', ['craving-test@example.com']);

    const { user, tokens } = await authService.registerUser({
      email: 'craving-test@example.com',
      password: 'TestPassword123!',
    });

    testUserId = user.id;
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['craving-test@example.com']);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up cravings after each test
    await pool.query('DELETE FROM cravings WHERE user_id = $1', [testUserId]);
  });

  describe('POST /api/cravings', () => {
    it('should create a craving successfully', async () => {
      const cravingData = {
        intensity: 7,
        triggers: ['stress', 'coffee'],
        reliefTechniquesUsed: ['deep breathing'],
        notes: 'Felt strong urge after morning coffee',
      };

      const response = await request(app)
        .post('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cravingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.userId).toBe(testUserId);
      expect(response.body.data.intensity).toBe(7);
      expect(response.body.data.triggers).toEqual(['stress', 'coffee']);
      expect(response.body.data.reliefTechniquesUsed).toEqual(['deep breathing']);
      expect(response.body.data.notes).toBe('Felt strong urge after morning coffee');
      expect(response.body.data.resolved).toBe(false);
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should create a craving without optional fields', async () => {
      const cravingData = {
        intensity: 5,
        triggers: ['boredom'],
      };

      const response = await request(app)
        .post('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cravingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.intensity).toBe(5);
      expect(response.body.data.triggers).toEqual(['boredom']);
      expect(response.body.data.reliefTechniquesUsed).toEqual([]);
      expect(response.body.data.notes).toBeNull();
    });

    it('should reject craving with invalid intensity (too low)', async () => {
      const cravingData = {
        intensity: 0,
        triggers: ['stress'],
      };

      const response = await request(app)
        .post('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cravingData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject craving with invalid intensity (too high)', async () => {
      const cravingData = {
        intensity: 11,
        triggers: ['stress'],
      };

      const response = await request(app)
        .post('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cravingData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject craving with empty triggers array', async () => {
      const cravingData = {
        intensity: 5,
        triggers: [],
      };

      const response = await request(app)
        .post('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cravingData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject craving with too many triggers', async () => {
      const cravingData = {
        intensity: 5,
        triggers: Array(21).fill('trigger'),
      };

      const response = await request(app)
        .post('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cravingData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject craving with notes too long', async () => {
      const cravingData = {
        intensity: 5,
        triggers: ['stress'],
        notes: 'a'.repeat(501),
      };

      const response = await request(app)
        .post('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cravingData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request without authentication', async () => {
      const cravingData = {
        intensity: 5,
        triggers: ['stress'],
      };

      const response = await request(app).post('/api/cravings').send(cravingData).expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/cravings', () => {
    it('should return empty array when no cravings exist', async () => {
      const response = await request(app)
        .get('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toEqual({
        limit: 50,
        offset: 0,
        count: 0,
      });
    });

    it('should return all cravings for user', async () => {
      // Create multiple cravings
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers, relief_techniques_used, notes)
         VALUES ($1, $2, $3, $4, $5), ($1, $6, $7, $8, $9)`,
        [
          testUserId,
          7,
          ['stress', 'coffee'],
          ['deep breathing'],
          'Morning craving',
          5,
          ['boredom'],
          [],
          'Afternoon craving',
        ]
      );

      const response = await request(app)
        .get('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.count).toBe(2);
    });

    it('should return cravings in descending order by creation date', async () => {
      // Create cravings with slight delay
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers, created_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '2 hours')`,
        [testUserId, 5, ['stress']]
      );

      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers, created_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '1 hour')`,
        [testUserId, 7, ['coffee']]
      );

      const response = await request(app)
        .get('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].intensity).toBe(7); // Most recent
      expect(response.body.data[1].intensity).toBe(5); // Older
    });

    it('should support pagination with limit', async () => {
      // Create 3 cravings
      for (let i = 0; i < 3; i++) {
        await pool.query(
          `INSERT INTO cravings (user_id, intensity, triggers)
           VALUES ($1, $2, $3)`,
          [testUserId, 5 + i, ['trigger']]
        );
      }

      const response = await request(app)
        .get('/api/cravings?limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should support pagination with offset', async () => {
      // Create 3 cravings
      for (let i = 0; i < 3; i++) {
        await pool.query(
          `INSERT INTO cravings (user_id, intensity, triggers)
           VALUES ($1, $2, $3)`,
          [testUserId, 5 + i, ['trigger']]
        );
      }

      const response = await request(app)
        .get('/api/cravings?limit=2&offset=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(1);
    });

    it('should only return cravings for authenticated user', async () => {
      // Create another user
      await pool.query('DELETE FROM users WHERE email = $1', ['other-user@example.com']);
      const { user: otherUser } = await authService.registerUser({
        email: 'other-user@example.com',
        password: 'TestPassword123!',
      });

      // Create craving for other user
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)`,
        [otherUser.id, 8, ['other trigger']]
      );

      // Create craving for test user
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)`,
        [testUserId, 5, ['my trigger']]
      );

      const response = await request(app)
        .get('/api/cravings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].triggers).toEqual(['my trigger']);

      // Clean up
      await pool.query('DELETE FROM users WHERE email = $1', ['other-user@example.com']);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/cravings').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/cravings/:id', () => {
    it('should return craving by id', async () => {
      const result = await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [testUserId, 7, ['stress'], 'Test craving']
      );

      const cravingId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/cravings/${cravingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(cravingId);
      expect(response.body.data.intensity).toBe(7);
      expect(response.body.data.triggers).toEqual(['stress']);
      expect(response.body.data.notes).toBe('Test craving');
    });

    it('should return 404 for non-existent craving', async () => {
      const response = await request(app)
        .get('/api/cravings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('CRAVING_NOT_FOUND');
    });

    it('should not return craving belonging to another user', async () => {
      // Create another user
      await pool.query('DELETE FROM users WHERE email = $1', ['other-user2@example.com']);
      const { user: otherUser } = await authService.registerUser({
        email: 'other-user2@example.com',
        password: 'TestPassword123!',
      });

      // Create craving for other user
      const result = await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [otherUser.id, 8, ['other trigger']]
      );

      const cravingId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/cravings/${cravingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('CRAVING_NOT_FOUND');

      // Clean up
      await pool.query('DELETE FROM users WHERE email = $1', ['other-user2@example.com']);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/cravings/00000000-0000-0000-0000-000000000000')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PUT /api/cravings/:id', () => {
    it('should update craving to resolved', async () => {
      const result = await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [testUserId, 7, ['stress']]
      );

      const cravingId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/cravings/${cravingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ resolved: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resolved).toBe(true);
    });

    it('should update craving duration', async () => {
      const result = await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [testUserId, 7, ['stress']]
      );

      const cravingId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/cravings/${cravingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ duration: 300 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.duration).toBe(300);
    });

    it('should update relief techniques used', async () => {
      const result = await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [testUserId, 7, ['stress']]
      );

      const cravingId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/cravings/${cravingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reliefTechniquesUsed: ['deep breathing', 'exercise'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reliefTechniquesUsed).toEqual(['deep breathing', 'exercise']);
    });

    it('should update multiple fields at once', async () => {
      const result = await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [testUserId, 7, ['stress']]
      );

      const cravingId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/cravings/${cravingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          resolved: true,
          duration: 600,
          reliefTechniquesUsed: ['meditation'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resolved).toBe(true);
      expect(response.body.data.duration).toBe(600);
      expect(response.body.data.reliefTechniquesUsed).toEqual(['meditation']);
    });

    it('should return 404 for non-existent craving', async () => {
      const response = await request(app)
        .put('/api/cravings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ resolved: true })
        .expect(404);

      expect(response.body.error.code).toBe('CRAVING_NOT_FOUND');
    });

    it('should reject invalid duration (negative)', async () => {
      const result = await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [testUserId, 7, ['stress']]
      );

      const cravingId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/cravings/${cravingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ duration: -1 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid duration (too large)', async () => {
      const result = await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [testUserId, 7, ['stress']]
      );

      const cravingId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/cravings/${cravingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ duration: 86401 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should not update craving belonging to another user', async () => {
      // Create another user
      await pool.query('DELETE FROM users WHERE email = $1', ['other-user3@example.com']);
      const { user: otherUser } = await authService.registerUser({
        email: 'other-user3@example.com',
        password: 'TestPassword123!',
      });

      // Create craving for other user
      const result = await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [otherUser.id, 8, ['other trigger']]
      );

      const cravingId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/cravings/${cravingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ resolved: true })
        .expect(404);

      expect(response.body.error.code).toBe('CRAVING_NOT_FOUND');

      // Clean up
      await pool.query('DELETE FROM users WHERE email = $1', ['other-user3@example.com']);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/cravings/00000000-0000-0000-0000-000000000000')
        .send({ resolved: true })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/cravings/analytics', () => {
    it('should return analytics with no cravings', async () => {
      const response = await request(app)
        .get('/api/cravings/analytics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        totalCravings: 0,
        averageIntensity: 0,
        mostCommonTriggers: [],
        cravingsByDay: [],
        resolutionRate: 0,
      });
    });

    it('should return analytics for cravings', async () => {
      // Create multiple cravings
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers, resolved)
         VALUES 
           ($1, 7, $2, true),
           ($1, 5, $3, false),
           ($1, 8, $4, true)`,
        [testUserId, ['stress', 'coffee'], ['boredom'], ['stress', 'alcohol']]
      );

      const response = await request(app)
        .get('/api/cravings/analytics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCravings).toBe(3);
      expect(response.body.data.averageIntensity).toBeCloseTo(6.7, 1);
      expect(response.body.data.resolutionRate).toBeCloseTo(66.7, 1);
      expect(response.body.data.mostCommonTriggers).toHaveLength(4);
      expect(response.body.data.cravingsByDay).toHaveLength(1);
    });

    it('should return most common triggers in descending order', async () => {
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES 
           ($1, 5, $2),
           ($1, 6, $3),
           ($1, 7, $4)`,
        [testUserId, ['stress'], ['stress', 'coffee'], ['stress', 'coffee', 'alcohol']]
      );

      const response = await request(app)
        .get('/api/cravings/analytics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const triggers = response.body.data.mostCommonTriggers;
      expect(triggers[0].trigger).toBe('stress');
      expect(triggers[0].count).toBe(3);
      expect(triggers[1].trigger).toBe('coffee');
      expect(triggers[1].count).toBe(2);
      expect(triggers[2].trigger).toBe('alcohol');
      expect(triggers[2].count).toBe(1);
    });

    it('should support custom days parameter', async () => {
      // Create old craving (40 days ago)
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers, created_at)
         VALUES ($1, 5, $2, NOW() - INTERVAL '40 days')`,
        [testUserId, ['old']]
      );

      // Create recent craving
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, 7, $2)`,
        [testUserId, ['recent']]
      );

      const response = await request(app)
        .get('/api/cravings/analytics?days=30')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.totalCravings).toBe(1);
      expect(response.body.data.mostCommonTriggers[0].trigger).toBe('recent');
    });

    it('should calculate resolution rate correctly', async () => {
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers, resolved)
         VALUES 
           ($1, 5, $2, true),
           ($1, 6, $3, true),
           ($1, 7, $4, false),
           ($1, 8, $5, false)`,
        [testUserId, ['a'], ['b'], ['c'], ['d']]
      );

      const response = await request(app)
        .get('/api/cravings/analytics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.resolutionRate).toBe(50);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/cravings/analytics').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/cravings/triggers', () => {
    it('should return empty array when no cravings exist', async () => {
      const response = await request(app)
        .get('/api/cravings/triggers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return trigger summary', async () => {
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES 
           ($1, 5, $2),
           ($1, 6, $3),
           ($1, 7, $4)`,
        [testUserId, ['stress'], ['stress', 'coffee'], ['coffee', 'alcohol']]
      );

      const response = await request(app)
        .get('/api/cravings/triggers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      
      // Find each trigger in the results (order may vary for equal counts)
      const stressTrigger = response.body.data.find((t: any) => t.trigger === 'stress');
      const coffeeTrigger = response.body.data.find((t: any) => t.trigger === 'coffee');
      const alcoholTrigger = response.body.data.find((t: any) => t.trigger === 'alcohol');
      
      expect(stressTrigger).toBeDefined();
      expect(stressTrigger.count).toBe(2);
      expect(coffeeTrigger).toBeDefined();
      expect(coffeeTrigger.count).toBe(2);
      expect(alcoholTrigger).toBeDefined();
      expect(alcoholTrigger.count).toBe(1);
    });

    it('should include all historical triggers', async () => {
      // Create old craving
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers, created_at)
         VALUES ($1, 5, $2, NOW() - INTERVAL '100 days')`,
        [testUserId, ['old trigger']]
      );

      // Create recent craving
      await pool.query(
        `INSERT INTO cravings (user_id, intensity, triggers)
         VALUES ($1, 7, $2)`,
        [testUserId, ['recent trigger']]
      );

      const response = await request(app)
        .get('/api/cravings/triggers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      const triggers = response.body.data.map((t: any) => t.trigger);
      expect(triggers).toContain('old trigger');
      expect(triggers).toContain('recent trigger');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/cravings/triggers').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
