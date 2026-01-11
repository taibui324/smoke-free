import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';

describe('Auth Controller - Registration', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test1@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('test1@example.com');
      expect(response.body.data.user.firstName).toBe('John');
      expect(response.body.data.user.lastName).toBe('Doe');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should register a user without optional fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'SecurePass123!',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test2@example.com');
      expect(response.body.data.user.firstName).toBeFalsy();
      expect(response.body.data.user.lastName).toBeFalsy();
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      await request(app).post('/api/auth/register').send({
        email: 'test3@example.com',
        password: 'SecurePass123!',
      });

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test3@example.com',
          password: 'DifferentPass456!',
        })
        .expect(409);

      expect(response.body.error.code).toBe('USER_EXISTS');
      expect(response.body.error.message).toBe('User with this email already exists');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Invalid email address',
          }),
        ])
      );
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test4@example.com',
          password: 'short',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: 'Password must be at least 8 characters',
          }),
        ])
      );
    });

    it('should reject registration with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'SecurePass123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test5@example.com',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'TEST6@EXAMPLE.COM',
          password: 'SecurePass123!',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('test6@example.com');
    });

    it('should create default user preferences', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test7@example.com',
          password: 'SecurePass123!',
        })
        .expect(201);

      const userId = response.body.data.user.id;

      // Verify preferences were created
      const prefsResult = await pool.query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
      );

      expect(prefsResult.rows.length).toBe(1);
      expect(prefsResult.rows[0].notifications_enabled).toBe(true);
      expect(prefsResult.rows[0].ai_chatbot_tone).toBe('empathetic');
      expect(prefsResult.rows[0].language).toBe('en');
    });

    it('should hash password with bcrypt', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test8@example.com',
          password: 'SecurePass123!',
        })
        .expect(201);

      const userId = response.body.data.user.id;

      // Verify password is hashed
      const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
        userId,
      ]);

      const passwordHash = userResult.rows[0].password_hash;
      expect(passwordHash).not.toBe('SecurePass123!');
      expect(passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt hash pattern
    });
  });
});


describe('Auth Controller - Login', () => {
  beforeEach(async () => {
    // Clean up before each test
    await pool.query('DELETE FROM users WHERE email = $1', ['logintest@example.com']);
    // Create a test user for login tests
    await request(app).post('/api/auth/register').send({
      email: 'logintest@example.com',
      password: 'SecurePass123!',
      firstName: 'Login',
      lastName: 'Test',
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['logintest@example.com']);
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('logintest@example.com');
      expect(response.body.data.user.firstName).toBe('Login');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should reject login with malformed email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update last_login_at timestamp', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body.data.user.lastLoginAt).toBeTruthy();
    });

    it('should normalize email to lowercase during login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'LOGINTEST@EXAMPLE.COM',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body.data.user.email).toBe('logintest@example.com');
    });
  });
});

describe('Auth Controller - Token Refresh', () => {
  let refreshToken: string;

  beforeEach(async () => {
    // Clean up before each test
    await pool.query('DELETE FROM users WHERE email = $1', ['refreshtest@example.com']);
    // Create a test user and get tokens
    const response = await request(app).post('/api/auth/register').send({
      email: 'refreshtest@example.com',
      password: 'SecurePass123!',
    });
    refreshToken = response.body.data.tokens.refreshToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['refreshtest@example.com']);
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject refresh with missing token', async () => {
      const response = await request(app).post('/api/auth/refresh').send({}).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject refresh with access token instead of refresh token', async () => {
      // Get an access token
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'refreshtest@example.com',
        password: 'SecurePass123!',
      });

      const accessToken = loginResponse.body.data.tokens.accessToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: accessToken,
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
      expect(response.body.error.message).toBe('Invalid refresh token');
    });
  });
});

describe('Auth Controller - Logout', () => {
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/api/auth/logout').send({}).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});

describe('Auth Controller - Password Reset', () => {
  beforeEach(async () => {
    // Clean up before each test
    await pool.query('DELETE FROM users WHERE email = $1', ['resetpwtest@example.com']);
    // Create a test user
    await request(app).post('/api/auth/register').send({
      email: 'resetpwtest@example.com',
      password: 'OldPassword123!',
      firstName: 'Reset',
      lastName: 'Test',
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['resetpwtest@example.com']);
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('should accept password reset request for existing email', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'resetpwtest@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('If the email exists, a reset link will be sent');
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('If the email exists, a reset link will be sent');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should store reset token in database', async () => {
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'resetpwtest@example.com',
        })
        .expect(200);

      const result = await pool.query(
        'SELECT password_reset_token, password_reset_expires FROM users WHERE email = $1',
        ['resetpwtest@example.com']
      );

      expect(result.rows[0].password_reset_token).toBeTruthy();
      expect(result.rows[0].password_reset_expires).toBeTruthy();
    });

    it('should set token expiration to 1 hour', async () => {
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'resetpwtest@example.com',
        })
        .expect(200);

      const result = await pool.query(
        'SELECT password_reset_expires FROM users WHERE email = $1',
        ['resetpwtest@example.com']
      );

      const expiresAt = new Date(result.rows[0].password_reset_expires);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

      expect(diffMinutes).toBeGreaterThan(55);
      expect(diffMinutes).toBeLessThan(65);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Generate a reset token
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'resetpwtest@example.com',
        })
        .expect(200);

      // Extract token from database (in real app, it would come from email)
      const result = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        ['resetpwtest@example.com']
      );
      const userId = result.rows[0].id;

      // Generate a valid token for testing
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      resetToken = jwt.sign(
        { userId, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store the token hash
      const bcrypt = require('bcrypt');
      const tokenHash = await bcrypt.hash(resetToken, 12);
      await pool.query(
        `UPDATE users 
         SET password_reset_token = $1, password_reset_expires = NOW() + INTERVAL '1 hour'
         WHERE id = $2`,
        [tokenHash, userId]
      );
    });

    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset successfully');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'resetpwtest@example.com',
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should not allow login with old password after reset', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      // Try to login with old password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'resetpwtest@example.com',
          password: 'OldPassword123!',
        })
        .expect(401);

      expect(loginResponse.body.error.code).toBe('AUTHENTICATION_FAILED');
    });

    it('should clear reset token after successful reset', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      const result = await pool.query(
        'SELECT password_reset_token, password_reset_expires FROM users WHERE email = $1',
        ['resetpwtest@example.com']
      );

      expect(result.rows[0].password_reset_token).toBeNull();
      expect(result.rows[0].password_reset_expires).toBeNull();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired token', async () => {
      // Create an expired token
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const result = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        ['resetpwtest@example.com']
      );
      const userId = result.rows[0].id;

      const expiredToken = jwt.sign(
        { userId, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject token with wrong type', async () => {
      // Use an access token instead of reset token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'resetpwtest@example.com',
          password: 'OldPassword123!',
        });

      const accessToken = loginResponse.body.data.tokens.accessToken;

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: accessToken,
          newPassword: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'short',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});


// Global cleanup
afterAll(async () => {
  // Clean up all test data
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['%test%@example.com']);
  await pool.end();
});
