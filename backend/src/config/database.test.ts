import { Pool } from 'pg';
import { pool, query, getClient } from './database';
import { logger } from '../utils/logger';

// Mock the logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Database Connection', () => {
  const originalEnv = process.env.NODE_ENV;

  afterAll(async () => {
    process.env.NODE_ENV = originalEnv;
    await pool.end();
  });

  describe('pool', () => {
    it('should be an instance of Pool', () => {
      expect(pool).toBeInstanceOf(Pool);
    });

    it('should have correct configuration', () => {
      const config = (pool as any).options;
      expect(config.max).toBe(20);
      expect(config.idleTimeoutMillis).toBe(30000);
      expect(config.connectionTimeoutMillis).toBe(2000);
    });

    it('should configure SSL for production', () => {
      const config = (pool as any).options;
      // SSL configuration is set at pool creation time
      // In production, it should have SSL enabled
      if (process.env.NODE_ENV === 'production') {
        expect(config.ssl).toBeDefined();
        expect(config.ssl.rejectUnauthorized).toBe(false);
      } else {
        expect(config.ssl).toBe(false);
      }
    });

    it('should log on connect event', () => {
      pool.emit('connect');
      expect(logger.debug).toHaveBeenCalledWith(
        'Database connection established'
      );
    });

    it('should log and exit on error event', () => {
      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);
      const testError = new Error('Database error');

      pool.emit('error', testError);

      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected database error',
        testError
      );
      expect(mockExit).toHaveBeenCalledWith(-1);

      mockExit.mockRestore();
    });
  });

  describe('query', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should execute a query successfully', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      const querySpy = jest
        .spyOn(pool, 'query')
        .mockResolvedValue(mockResult as never);

      const result = await query('SELECT 1 as id');

      expect(querySpy).toHaveBeenCalledWith('SELECT 1 as id', undefined);
      expect(result).toEqual(mockResult);
      expect(logger.debug).toHaveBeenCalledWith(
        'Executed query',
        expect.objectContaining({
          text: 'SELECT 1 as id',
          rows: 1,
        })
      );
    });

    it('should execute a query with parameters', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
      const querySpy = jest
        .spyOn(pool, 'query')
        .mockResolvedValue(mockResult as never);

      const result = await query('SELECT * FROM users WHERE id = $1', [1]);

      expect(querySpy).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
      expect(result).toEqual(mockResult);
    });

    it('should log and throw error on query failure', async () => {
      const mockError = new Error('Query failed');
      const querySpy = jest
        .spyOn(pool, 'query')
        .mockRejectedValue(mockError as never);

      await expect(query('INVALID SQL')).rejects.toThrow('Query failed');

      expect(querySpy).toHaveBeenCalledWith('INVALID SQL', undefined);
      expect(logger.error).toHaveBeenCalledWith(
        'Query error',
        expect.objectContaining({
          text: 'INVALID SQL',
          error: mockError,
        })
      );
    });

    it('should measure query execution time', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      jest.spyOn(pool, 'query').mockResolvedValue(mockResult as never);

      await query('SELECT 1');

      expect(logger.debug).toHaveBeenCalledWith(
        'Executed query',
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );
    });
  });

  describe('getClient', () => {
    let mockClient: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: jest.fn(),
      };
    });

    it('should return a client from the pool', async () => {
      const connectSpy = jest
        .spyOn(pool, 'connect')
        .mockResolvedValue(mockClient as never);

      const client = await getClient();

      expect(connectSpy).toHaveBeenCalled();
      expect(client).toBeDefined();
      expect(typeof client.query).toBe('function');
      expect(typeof client.release).toBe('function');
    });

    it('should wrap client query method', async () => {
      const originalQuery = mockClient.query;
      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient as never);

      const client = await getClient();
      await client.query('SELECT 1');

      // The wrapped query should call the original
      expect(originalQuery).toHaveBeenCalledWith('SELECT 1');
    });

    it('should clear timeout on client release', async () => {
      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient as never);
      jest.useFakeTimers();

      const client = await getClient();
      client.release();

      expect(mockClient.release).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should log warning if client is held for too long', async () => {
      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient as never);
      jest.useFakeTimers();

      await getClient();

      // Fast-forward time by 5 seconds
      jest.advanceTimersByTime(5000);

      expect(logger.error).toHaveBeenCalledWith(
        'A client has been checked out for more than 5 seconds!'
      );

      jest.useRealTimers();
    });

    it('should restore original methods after release', async () => {
      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient as never);

      const originalQuery = mockClient.query;
      const originalRelease = mockClient.release;

      const client = await getClient();
      client.release();

      expect(client.query).toBe(originalQuery);
      expect(client.release).toBe(originalRelease);
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      const mockError = new Error('Connection failed');
      const connectSpy = jest
        .spyOn(pool, 'connect')
        .mockRejectedValue(mockError as never);

      await expect(getClient()).rejects.toThrow('Connection failed');
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should handle query timeout', async () => {
      const timeoutError = new Error('Query timeout');
      const querySpy = jest
        .spyOn(pool, 'query')
        .mockRejectedValue(timeoutError as never);

      await expect(query('SELECT pg_sleep(10)')).rejects.toThrow(
        'Query timeout'
      );
      expect(querySpy).toHaveBeenCalled();
    });
  });
});
