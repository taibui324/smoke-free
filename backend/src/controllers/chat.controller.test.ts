import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { authService } from '../services/auth.service';

describe('Chat Controller', () => {
  let testUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Clean up and create test user
    await pool.query('DELETE FROM users WHERE email = $1', ['chat-test@example.com']);

    const { user, tokens } = await authService.registerUser({
      email: 'chat-test@example.com',
      password: 'TestPassword123!',
    });

    testUserId = user.id;
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['chat-test@example.com']);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up chat messages after each test
    await pool.query('DELETE FROM chat_messages WHERE user_id = $1', [testUserId]);
  });

  describe('POST /api/chat/message', () => {
    it('should send a message and receive AI response', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: 'Hello, I need help with a craving',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('assistantMessage');
      
      // Check user message
      expect(response.body.data.message.role).toBe('user');
      expect(response.body.data.message.content).toBe('Hello, I need help with a craving');
      expect(response.body.data.message.userId).toBe(testUserId);
      
      // Check assistant message
      expect(response.body.data.assistantMessage.role).toBe('assistant');
      expect(response.body.data.assistantMessage.content).toBeTruthy();
      expect(response.body.data.assistantMessage.userId).toBe(testUserId);
    });

    it('should handle message with context', async () => {
      // Create a quit plan first
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - 5);

      await pool.query(
        `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testUserId, quitDate, 20, 10, 20, ['health']]
      );

      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: 'How am I doing?',
          includeContext: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assistantMessage.content).toBeTruthy();
    });

    it('should reject empty message', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: '',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject message that is too long', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: 'a'.repeat(2001),
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Hello',
        })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should provide fallback response when OpenAI fails', async () => {
      // This test will use the fallback since we're using a test API key
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: 'I have a craving',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assistantMessage.content).toContain('craving');
    });

    it('should detect craving-related messages', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: 'I really want to smoke right now',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      const content = response.body.data.assistantMessage.content.toLowerCase();
      expect(content).toMatch(/craving|breath|technique|strategy/);
    });

    it('should detect breathing exercise requests', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: 'Can you help me with a breathing exercise?',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      const content = response.body.data.assistantMessage.content.toLowerCase();
      expect(content).toMatch(/breath|inhale|exhale|relax/);
    });
  });

  describe('GET /api/chat/history', () => {
    it('should return empty array when no messages exist', async () => {
      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return chat history', async () => {
      // Send a message first
      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: 'Test message',
        });

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2); // User + assistant messages
    });

    it('should return messages in descending order by creation date', async () => {
      // Send multiple messages
      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'First message' });

      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Second message' });

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(4);
      
      // Check that messages are in descending order
      const dates = response.body.data.map((msg: any) => new Date(msg.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it('should support limit parameter', async () => {
      // Send multiple messages
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/chat/message')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ message: `Message ${i}` });
      }

      const response = await request(app)
        .get('/api/chat/history?limit=3')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(3);
    });

    it('should only return messages for authenticated user', async () => {
      // Create another user
      await pool.query('DELETE FROM users WHERE email = $1', ['other-chat-user@example.com']);
      const { tokens: otherTokens } = await authService.registerUser({
        email: 'other-chat-user@example.com',
        password: 'TestPassword123!',
      });

      // Send message as other user
      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${otherTokens.accessToken}`)
        .send({ message: 'Other user message' });

      // Send message as test user
      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Test user message' });

      // Get history for test user
      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should only see test user's messages
      const userMessages = response.body.data.filter((msg: any) => msg.role === 'user');
      expect(userMessages.every((msg: any) => msg.content === 'Test user message')).toBe(true);

      // Clean up
      await pool.query('DELETE FROM users WHERE email = $1', ['other-chat-user@example.com']);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/chat/history').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('DELETE /api/chat/history', () => {
    it('should delete all chat history for user', async () => {
      // Send some messages
      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Message 1' });

      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Message 2' });

      // Delete history
      const deleteResponse = await request(app)
        .delete('/api/chat/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.data.deletedCount).toBeGreaterThan(0);

      // Verify history is empty
      const historyResponse = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(historyResponse.body.data).toEqual([]);
    });

    it('should return 0 when no messages to delete', async () => {
      const response = await request(app)
        .delete('/api/chat/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(0);
    });

    it('should only delete messages for authenticated user', async () => {
      // Create another user
      await pool.query('DELETE FROM users WHERE email = $1', ['other-chat-user2@example.com']);
      const { tokens: otherTokens } = await authService.registerUser({
        email: 'other-chat-user2@example.com',
        password: 'TestPassword123!',
      });

      // Send messages for both users
      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${otherTokens.accessToken}`)
        .send({ message: 'Other user message' });

      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Test user message' });

      // Delete test user's history
      await request(app)
        .delete('/api/chat/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify test user's history is empty
      const testUserHistory = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(testUserHistory.body.data).toEqual([]);

      // Verify other user's history still exists
      const otherUserHistory = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${otherTokens.accessToken}`)
        .expect(200);

      expect(otherUserHistory.body.data.length).toBeGreaterThan(0);

      // Clean up
      await pool.query('DELETE FROM users WHERE email = $1', ['other-chat-user2@example.com']);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).delete('/api/chat/history').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
