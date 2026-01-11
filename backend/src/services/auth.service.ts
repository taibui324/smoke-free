import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const BCRYPT_COST_FACTOR = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export interface RegisterUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST_FACTOR);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(userId: string): string {
    return jwt.sign({ userId, type: 'access' }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  verifyToken(token: string): { userId: string; type: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        type: string;
      };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async registerUser(data: RegisterUserData): Promise<{ user: User; tokens: AuthTokens }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [data.email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, first_name, last_name, profile_picture_url, is_active, created_at, updated_at, last_login_at`,
        [data.email.toLowerCase(), passwordHash, data.firstName, data.lastName]
      );

      const userRow = userResult.rows[0];

      // Create default preferences
      await client.query(
        `INSERT INTO user_preferences (user_id)
         VALUES ($1)`,
        [userRow.id]
      );

      await client.query('COMMIT');

      const user: User = {
        id: userRow.id,
        email: userRow.email,
        firstName: userRow.first_name,
        lastName: userRow.last_name,
        profilePictureUrl: userRow.profile_picture_url,
        isActive: userRow.is_active,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
        lastLoginAt: userRow.last_login_at,
      };

      const tokens: AuthTokens = {
        accessToken: this.generateAccessToken(user.id),
        refreshToken: this.generateRefreshToken(user.id),
      };

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      return { user, tokens };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('User registration failed', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async loginUser(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, profile_picture_url, is_active, created_at, updated_at, last_login_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const userRow = result.rows[0];

    if (!userRow.is_active) {
      throw new Error('Account is inactive');
    }

    const isPasswordValid = await this.verifyPassword(password, userRow.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login time
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userRow.id]
    );

    const user: User = {
      id: userRow.id,
      email: userRow.email,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      profilePictureUrl: userRow.profile_picture_url,
      isActive: userRow.is_active,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
      lastLoginAt: new Date(),
    };

    const tokens: AuthTokens = {
      accessToken: this.generateAccessToken(user.id),
      refreshToken: this.generateRefreshToken(user.id),
    };

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    return { user, tokens };
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, profile_picture_url, is_active, created_at, updated_at, last_login_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const userRow = result.rows[0];

    return {
      id: userRow.id,
      email: userRow.email,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      profilePictureUrl: userRow.profile_picture_url,
      isActive: userRow.is_active,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
      lastLoginAt: userRow.last_login_at,
    };
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists for security
      throw new Error('If the email exists, a reset link will be sent');
    }

    const userId = result.rows[0].id;
    const resetToken = jwt.sign(
      { userId, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' } as jwt.SignOptions
    );

    // Store reset token hash in database
    const tokenHash = await this.hashPassword(resetToken);
    await pool.query(
      `UPDATE users 
       SET password_reset_token = $1, password_reset_expires = NOW() + INTERVAL '1 hour'
       WHERE id = $2`,
      [tokenHash, userId]
    );

    logger.info('Password reset token generated', { userId, email });

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        type: string;
      };

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid reset token');
      }

      const result = await pool.query(
        `SELECT id, password_reset_token, password_reset_expires 
         FROM users 
         WHERE id = $1 AND is_active = true`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired reset token');
      }

      const user = result.rows[0];

      // Check if token has expired
      if (!user.password_reset_expires || new Date() > new Date(user.password_reset_expires)) {
        throw new Error('Invalid or expired reset token');
      }

      // Verify token hash matches
      const tokenHash = user.password_reset_token;
      if (!tokenHash) {
        throw new Error('Invalid or expired reset token');
      }

      const isTokenValid = await this.verifyPassword(token, tokenHash);
      if (!isTokenValid) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password and update
      const newPasswordHash = await this.hashPassword(newPassword);
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newPasswordHash, decoded.userId]
      );

      logger.info('Password reset successful', { userId: decoded.userId });
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new Error('Invalid or expired reset token');
      }
      // Re-throw our custom errors
      if (error.message === 'Invalid reset token' || error.message === 'Invalid or expired reset token') {
        throw error;
      }
      throw error;
    }
  }
}

export const authService = new AuthService();
