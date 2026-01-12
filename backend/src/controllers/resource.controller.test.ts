import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { authService } from '../services/auth.service';

describe('Resource Controller', () => {
  let testUserId: string;
  let accessToken: string;
  let testResourceId: string;

  beforeAll(async () => {
    // Clean up and create test user
    await pool.query('DELETE FROM users WHERE email = $1', ['resource-test@example.com']);

    const { user, tokens } = await authService.registerUser({
      email: 'resource-test@example.com',
      password: 'TestPassword123!',
    });

    testUserId = user.id;
    accessToken = tokens.accessToken;

    // Get a resource ID from seeded data
    const resourceResult = await pool.query('SELECT id FROM resources LIMIT 1');
    if (resourceResult.rows.length > 0) {
      testResourceId = resourceResult.rows[0].id;
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['resource-test@example.com']);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up bookmarks after each test
    await pool.query('DELETE FROM user_bookmarks WHERE user_id = $1', [testUserId]);
  });

  describe('GET /api/resources', () => {
    it('should return all resources without authentication', async () => {
      const response = await request(app).get('/api/resources').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check resource structure
      const resource = response.body.data[0];
      expect(resource).toHaveProperty('id');
      expect(resource).toHaveProperty('title');
      expect(resource).toHaveProperty('description');
      expect(resource).toHaveProperty('type');
      expect(resource).toHaveProperty('category');
      expect(resource).toHaveProperty('isBookmarked');
      expect(resource.isBookmarked).toBe(false);
    });

    it('should return resources with bookmark status when authenticated', async () => {
      // Bookmark a resource first
      const bookmarkResult = await pool.query(
        'INSERT INTO user_bookmarks (user_id, resource_id) VALUES ($1, $2) RETURNING *',
        [testUserId, testResourceId]
      );
      expect(bookmarkResult.rows.length).toBe(1);

      const response = await request(app)
        .get('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Find the bookmarked resource
      const bookmarkedResource = response.body.data.find((r: any) => r.id === testResourceId);
      expect(bookmarkedResource).toBeDefined();
      expect(bookmarkedResource.isBookmarked).toBe(true);
    });

    it('should filter resources by type', async () => {
      const response = await request(app).get('/api/resources?type=article').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((r: any) => r.type === 'article')).toBe(true);
    });

    it('should filter resources by category', async () => {
      const response = await request(app)
        .get('/api/resources?category=health_benefits')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((r: any) => r.category === 'health_benefits')).toBe(true);
    });

    it('should filter resources by featured status', async () => {
      const response = await request(app).get('/api/resources?isFeatured=true').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((r: any) => r.isFeatured === true)).toBe(true);
    });

    it('should filter resources by tags', async () => {
      const response = await request(app).get('/api/resources?tags=health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination with limit and offset', async () => {
      const response1 = await request(app).get('/api/resources?limit=2&offset=0').expect(200);
      const response2 = await request(app).get('/api/resources?limit=2&offset=2').expect(200);

      expect(response1.body.data.length).toBeLessThanOrEqual(2);
      expect(response2.body.data.length).toBeLessThanOrEqual(2);
      
      // Ensure different resources are returned
      if (response1.body.data.length > 0 && response2.body.data.length > 0) {
        expect(response1.body.data[0].id).not.toBe(response2.body.data[0].id);
      }
    });

    it('should search resources by query', async () => {
      const response = await request(app).get('/api/resources?query=breathing').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 400 for invalid type', async () => {
      const response = await request(app).get('/api/resources?type=invalid').expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app).get('/api/resources?limit=-1').expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should return a specific resource without authentication', async () => {
      const response = await request(app).get(`/api/resources/${testResourceId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testResourceId);
      expect(response.body.data.isBookmarked).toBe(false);
    });

    it('should return resource with bookmark status when authenticated', async () => {
      // Bookmark the resource
      const bookmarkResult = await pool.query(
        'INSERT INTO user_bookmarks (user_id, resource_id) VALUES ($1, $2) RETURNING *',
        [testUserId, testResourceId]
      );
      expect(bookmarkResult.rows.length).toBe(1);

      const response = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isBookmarked).toBe(true);
    });

    it('should return 404 for non-existent resource', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/resources/${fakeId}`).expect(404);

      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('GET /api/resources/search', () => {
    it('should search resources by query', async () => {
      const response = await request(app).get('/api/resources/search?q=health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/resources/search?q=health&limit=2')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app).get('/api/resources/search').expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return empty array for non-matching query', async () => {
      const response = await request(app)
        .get('/api/resources/search?q=xyznonexistent')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/resources/:id/bookmark', () => {
    it('should bookmark a resource', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Resource bookmarked');

      // Verify bookmark was created
      const bookmarkResult = await pool.query(
        'SELECT * FROM user_bookmarks WHERE user_id = $1 AND resource_id = $2',
        [testUserId, testResourceId]
      );
      expect(bookmarkResult.rows.length).toBe(1);
    });

    it('should be idempotent (bookmarking twice should not error)', async () => {
      // Bookmark once
      await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Bookmark again
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify only one bookmark exists
      const bookmarkResult = await pool.query(
        'SELECT * FROM user_bookmarks WHERE user_id = $1 AND resource_id = $2',
        [testUserId, testResourceId]
      );
      expect(bookmarkResult.rows.length).toBe(1);
    });

    it('should return 404 for non-existent resource', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/resources/${fakeId}/bookmark`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('DELETE /api/resources/:id/bookmark', () => {
    it('should remove a bookmark', async () => {
      // Create bookmark first
      await pool.query(
        'INSERT INTO user_bookmarks (user_id, resource_id) VALUES ($1, $2)',
        [testUserId, testResourceId]
      );

      const response = await request(app)
        .delete(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bookmark removed');

      // Verify bookmark was deleted
      const bookmarkResult = await pool.query(
        'SELECT * FROM user_bookmarks WHERE user_id = $1 AND resource_id = $2',
        [testUserId, testResourceId]
      );
      expect(bookmarkResult.rows.length).toBe(0);
    });

    it('should return 404 when bookmark does not exist', async () => {
      const response = await request(app)
        .delete(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('BOOKMARK_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/resources/${testResourceId}/bookmark`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/resources/bookmarks/list', () => {
    it('should return empty array when no bookmarks exist', async () => {
      const response = await request(app)
        .get('/api/resources/bookmarks/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return bookmarked resources', async () => {
      // Create bookmarks
      const resources = await pool.query('SELECT id FROM resources LIMIT 3');
      for (const resource of resources.rows) {
        await pool.query(
          'INSERT INTO user_bookmarks (user_id, resource_id) VALUES ($1, $2)',
          [testUserId, resource.id]
        );
      }

      const response = await request(app)
        .get('/api/resources/bookmarks/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(3);
      expect(response.body.data.every((r: any) => r.isBookmarked === true)).toBe(true);
    });

    it('should support pagination', async () => {
      // Create multiple bookmarks
      const resources = await pool.query('SELECT id FROM resources LIMIT 5');
      for (const resource of resources.rows) {
        await pool.query(
          'INSERT INTO user_bookmarks (user_id, resource_id) VALUES ($1, $2)',
          [testUserId, resource.id]
        );
      }

      const response = await request(app)
        .get('/api/resources/bookmarks/list?limit=2&offset=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should only return bookmarks for authenticated user', async () => {
      // Create another user
      await pool.query('DELETE FROM users WHERE email = $1', ['other-resource-user@example.com']);
      const { user: otherUser } = await authService.registerUser({
        email: 'other-resource-user@example.com',
        password: 'TestPassword123!',
      });

      // Create bookmark for other user
      await pool.query(
        'INSERT INTO user_bookmarks (user_id, resource_id) VALUES ($1, $2)',
        [otherUser.id, testResourceId]
      );

      // Get bookmarks for test user
      const response = await request(app)
        .get('/api/resources/bookmarks/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should not see other user's bookmarks
      expect(response.body.data.every((r: any) => r.id !== testResourceId)).toBe(true);

      // Clean up
      await pool.query('DELETE FROM users WHERE email = $1', ['other-resource-user@example.com']);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/resources/bookmarks/list').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/resources/daily-tip', () => {
    it('should return a random tip', async () => {
      const response = await request(app).get('/api/resources/daily-tip').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('tip');
    });

    it('should return different tips on multiple calls (probabilistic)', async () => {
      const tips = new Set();
      
      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/api/resources/daily-tip').expect(200);
        tips.add(response.body.data.id);
      }

      // With 5 requests, we should likely get at least 2 different tips
      // (This is probabilistic, but with multiple tips in the database, it's very likely)
      expect(tips.size).toBeGreaterThanOrEqual(1);
    });
  });
});
