import request from 'supertest';
import express, { Response } from 'express';
import { authenticate, optionalAuthenticate, AuthRequest } from './auth.middleware';
import { pool } from '../config/database';
import { authService } from '../services/auth.service';

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Protected route
  app.get('/protected', authenticate, (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      userId: req.userId,
      user: req.user,
    });
  });

  // Optional auth route
  app.get('/optional', optionalAuthenticate, (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      authenticated: !!req.userId,
      userId: req.userId,
      user: req.user,
    });
  });

  return app;
};

describe('Authentication Middleware', () => {
  let app: express.Application;
  let testUserId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = createTestApp();

    // Clean up and create test user
    await pool.query('DELETE FROM users WHERE email = $1', ['middleware-test@example.com']);

    const { user, tokens } = await authService.registerUser({
      email: 'middleware-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Middleware',
      lastName: 'Test',
    });

    testUserId = user.id;
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['middleware-test@example.com']);
    await pool.end();
  });

  describe('authenticate middleware', () => {
    it('should allow access with valid access token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe(testUserId);
      expect(response.body.user.email).toBe('middleware-test@example.com');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app).get('/protected').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject request with refresh token instead of access token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
      expect(response.body.error.message).toBe('Invalid access token');
    });

    it('should reject request with expired token', async () => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

      const expiredToken = jwt.sign(
        { userId: testUserId, type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject request for inactive user', async () => {
      // Deactivate user
      await pool.query('UPDATE users SET is_active = false WHERE id = $1', [testUserId]);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('User not found or inactive');

      // Reactivate user for other tests
      await pool.query('UPDATE users SET is_active = true WHERE id = $1', [testUserId]);
    });

    it('should reject request for non-existent user', async () => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

      const fakeToken = jwt.sign(
        { userId: '00000000-0000-0000-0000-000000000000', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should attach user info to request object', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user).toEqual({
        id: testUserId,
        email: 'middleware-test@example.com',
        firstName: 'Middleware',
        lastName: 'Test',
      });
    });
  });

  describe('optionalAuthenticate middleware', () => {
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.userId).toBe(testUserId);
    });

    it('should allow access without token', async () => {
      const response = await request(app).get('/optional').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.userId).toBeUndefined();
    });

    it('should allow access with invalid token', async () => {
      const response = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });

    it('should allow access with expired token', async () => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

      const expiredToken = jwt.sign(
        { userId: testUserId, type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });

    it('should attach user info when token is valid', async () => {
      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user).toEqual({
        id: testUserId,
        email: 'middleware-test@example.com',
        firstName: 'Middleware',
        lastName: 'Test',
      });
    });

    it('should not attach user info when token is invalid', async () => {
      const response = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.user).toBeUndefined();
    });
  });
});
