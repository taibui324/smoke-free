import * as fc from 'fast-check';
import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { authService } from '../services/auth.service';

// Feature: quit-smoking-app, Property 1: User Registration and Authentication
describe('Property 1: User Registration and Authentication', () => {
  it('should create account and authenticate successfully for any valid email/password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress().map((email) => `prop-test-${email}`),
        fc.string({ minLength: 8, maxLength: 128 }),
        async (email, password) => {
          // Clean up before test
          await pool.query('DELETE FROM users WHERE email = $1', [email.toLowerCase()]);

          // Register user
          const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({ email, password });

          // Should successfully register
          expect(registerResponse.status).toBe(201);
          expect(registerResponse.body.success).toBe(true);
          expect(registerResponse.body.data.user.email).toBe(email.toLowerCase());
          expect(registerResponse.body.data.tokens).toHaveProperty('accessToken');
          expect(registerResponse.body.data.tokens).toHaveProperty('refreshToken');

          // Should be able to login with same credentials
          const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          expect(loginResponse.status).toBe(200);
          expect(loginResponse.body.success).toBe(true);
          expect(loginResponse.body.data.user.email).toBe(email.toLowerCase());
          expect(loginResponse.body.data.tokens).toHaveProperty('accessToken');

          // Clean up after test
          await pool.query('DELETE FROM users WHERE email = $1', [email.toLowerCase()]);
        }
      ),
      { numRuns: 20 } // Reduced from 100 due to bcrypt performance
    );
  }, 30000); // 30 second timeout
});

// Feature: quit-smoking-app, Property 2: Invalid Credential Rejection
describe('Property 2: Invalid Credential Rejection', () => {
  it('should reject malformed emails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('invalid'),
          fc.constant('test@'),
          fc.constant('@example.com'),
          fc.constant('test..test@example.com'),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('@'))
        ),
        fc.string({ minLength: 8 }),
        async (invalidEmail, password) => {
          const response = await request(app)
            .post('/api/auth/register')
            .send({ email: invalidEmail, password });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
          expect(response.body.error.message).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject weak passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress().map((email) => `prop-test-weak-${email}`),
        fc.string({ maxLength: 7 }), // Passwords shorter than 8 characters
        async (email, weakPassword) => {
          const response = await request(app)
            .post('/api/auth/register')
            .send({ email, password: weakPassword });

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
          expect(response.body.error.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'password',
              }),
            ])
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject login with non-existent user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress().map((email) => `nonexistent-${email}`),
        fc.string({ minLength: 8 }),
        async (email, password) => {
          const response = await request(app).post('/api/auth/login').send({ email, password });

          expect(response.status).toBe(401);
          expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
          expect(response.body.error.message).toBe('Invalid email or password');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: quit-smoking-app, Property 40: Password Hashing Standards
describe('Property 40: Password Hashing Standards', () => {
  it('should hash all passwords with bcrypt cost factor 12', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress().map((email) => `prop-test-hash-${email}`),
        fc.string({ minLength: 8, maxLength: 128 }),
        async (email, password) => {
          // Clean up before test
          await pool.query('DELETE FROM users WHERE email = $1', [email.toLowerCase()]);

          // Register user
          const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({ email, password });

          expect(registerResponse.status).toBe(201);

          const userId = registerResponse.body.data.user.id;

          // Verify password is hashed in database
          const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
            userId,
          ]);

          const passwordHash = userResult.rows[0].password_hash;

          // Password should not be stored in plaintext
          expect(passwordHash).not.toBe(password);

          // Should match bcrypt hash pattern with cost factor 12
          expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);

          // Should be able to verify password
          const isValid = await authService.verifyPassword(password, passwordHash);
          expect(isValid).toBe(true);

          // Clean up after test
          await pool.query('DELETE FROM users WHERE email = $1', [email.toLowerCase()]);
        }
      ),
      { numRuns: 20 } // Reduced from 100 due to bcrypt performance
    );
  }, 30000); // 30 second timeout

  it('should never store plaintext passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress().map((email) => `prop-test-plain-${email}`),
        fc.string({ minLength: 8, maxLength: 128 }),
        async (email, password) => {
          // Clean up before test
          await pool.query('DELETE FROM users WHERE email = $1', [email.toLowerCase()]);

          // Register user
          await request(app).post('/api/auth/register').send({ email, password });

          // Query database directly
          const result = await pool.query(
            'SELECT password_hash FROM users WHERE email = $1',
            [email.toLowerCase()]
          );

          if (result.rows.length > 0) {
            const storedHash = result.rows[0].password_hash;

            // Stored value should never equal the plaintext password
            expect(storedHash).not.toBe(password);

            // Should be a valid bcrypt hash
            expect(storedHash).toMatch(/^\$2[aby]\$/);
          }

          // Clean up after test
          await pool.query('DELETE FROM users WHERE email = $1', [email.toLowerCase()]);
        }
      ),
      { numRuns: 20 } // Reduced from 100 due to bcrypt performance
    );
  }, 30000); // 30 second timeout
});


// Global cleanup
afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['%prop-test%']);
  await pool.end();
});
