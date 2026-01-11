import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { authService } from '../services/auth.service';

describe('Profile Controller', () => {
  let testUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Clean up and create test user
    await pool.query('DELETE FROM users WHERE email = $1', ['profile-test@example.com']);

    const { user, tokens } = await authService.registerUser({
      email: 'profile-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Profile',
      lastName: 'Test',
    });

    testUserId = user.id;
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['profile-test@example.com']);
    await pool.end();
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile with authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toHaveProperty('id', testUserId);
      expect(response.body.data.profile).toHaveProperty('email', 'profile-test@example.com');
      expect(response.body.data.profile).toHaveProperty('firstName', 'Profile');
      expect(response.body.data.profile).toHaveProperty('lastName', 'Test');
      expect(response.body.data.preferences).toHaveProperty('notificationsEnabled');
      expect(response.body.data.preferences).toHaveProperty('aiChatbotTone');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/users/profile').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update profile with valid data', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.firstName).toBe('Updated');
      expect(response.body.data.profile.lastName).toBe('Name');
    });

    it('should update only firstName', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'OnlyFirst',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.firstName).toBe('OnlyFirst');
      expect(response.body.data.profile.lastName).toBe('Name'); // Should remain unchanged
    });

    it('should update profile picture URL', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          profilePictureUrl: 'https://example.com/avatar.jpg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.profilePictureUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should reject invalid profile picture URL', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          profilePictureUrl: 'not-a-url',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({
          firstName: 'Test',
        })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle empty update gracefully', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/users/preferences', () => {
    it('should update preferences with valid data', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          notificationsEnabled: false,
          aiChatbotTone: 'motivational',
          theme: 'dark',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences.notificationsEnabled).toBe(false);
      expect(response.body.data.preferences.aiChatbotTone).toBe('motivational');
      expect(response.body.data.preferences.theme).toBe('dark');
    });

    it('should update daily check-in time', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dailyCheckInTime: '09:30',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences.dailyCheckInTime).toBe('09:30');
    });

    it('should reject invalid time format', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dailyCheckInTime: '25:00',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid chatbot tone', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          aiChatbotTone: 'invalid',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid theme', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          theme: 'invalid',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update language preference', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          language: 'es',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences.language).toBe('es');
    });

    it('should handle empty update gracefully', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/users/account', () => {
    it('should soft delete user account', async () => {
      // Create a separate user for deletion test
      await pool.query('DELETE FROM users WHERE email = $1', ['delete-test@example.com']);

      const { user, tokens } = await authService.registerUser({
        email: 'delete-test@example.com',
        password: 'TestPassword123!',
      });

      const deleteToken = tokens.accessToken;

      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${deleteToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account deleted successfully');

      // Verify user is soft deleted
      const result = await pool.query('SELECT is_active FROM users WHERE id = $1', [user.id]);
      expect(result.rows[0].is_active).toBe(false);

      // Verify cannot access profile after deletion
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${deleteToken}`)
        .expect(401);

      // Clean up
      await pool.query('DELETE FROM users WHERE email = $1', ['delete-test@example.com']);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).delete('/api/users/account').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
