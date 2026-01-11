import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  dailyCheckInTime?: string;
  cravingAlertsEnabled: boolean;
  aiChatbotTone: 'empathetic' | 'motivational' | 'direct';
  language: string;
  theme: 'light' | 'dark' | 'auto';
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
}

export interface UpdatePreferencesData {
  notificationsEnabled?: boolean;
  dailyCheckInTime?: string;
  cravingAlertsEnabled?: boolean;
  aiChatbotTone?: 'empathetic' | 'motivational' | 'direct';
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export class ProfileService {
  async getProfile(userId: string): Promise<{ profile: UserProfile; preferences: UserPreferences } | null> {
    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.first_name, u.last_name, u.profile_picture_url,
        u.created_at, u.updated_at, u.last_login_at,
        p.notifications_enabled, p.daily_check_in_time, p.craving_alerts_enabled,
        p.ai_chatbot_tone, p.language, p.theme
       FROM users u
       LEFT JOIN user_preferences p ON u.id = p.user_id
       WHERE u.id = $1 AND u.is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      profile: {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        profilePictureUrl: row.profile_picture_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
      },
      preferences: {
        notificationsEnabled: row.notifications_enabled ?? true,
        dailyCheckInTime: row.daily_check_in_time,
        cravingAlertsEnabled: row.craving_alerts_enabled ?? true,
        aiChatbotTone: row.ai_chatbot_tone ?? 'empathetic',
        language: row.language ?? 'en',
        theme: row.theme ?? 'auto',
      },
    };
  }

  async updateProfile(userId: string, data: UpdateProfileData): Promise<UserProfile> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(data.firstName);
    }

    if (data.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(data.lastName);
    }

    if (data.profilePictureUrl !== undefined) {
      updates.push(`profile_picture_url = $${paramIndex++}`);
      values.push(data.profilePictureUrl);
    }

    if (updates.length === 0) {
      // No updates, just return current profile
      const current = await this.getProfile(userId);
      if (!current) {
        throw new Error('User not found');
      }
      return current.profile;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND is_active = true
       RETURNING id, email, first_name, last_name, profile_picture_url, created_at, updated_at, last_login_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const row = result.rows[0];

    logger.info('Profile updated', { userId });

    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      profilePictureUrl: row.profile_picture_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  }

  async updatePreferences(userId: string, data: UpdatePreferencesData): Promise<UserPreferences> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.notificationsEnabled !== undefined) {
      updates.push(`notifications_enabled = $${paramIndex++}`);
      values.push(data.notificationsEnabled);
    }

    if (data.dailyCheckInTime !== undefined) {
      updates.push(`daily_check_in_time = $${paramIndex++}`);
      values.push(data.dailyCheckInTime);
    }

    if (data.cravingAlertsEnabled !== undefined) {
      updates.push(`craving_alerts_enabled = $${paramIndex++}`);
      values.push(data.cravingAlertsEnabled);
    }

    if (data.aiChatbotTone !== undefined) {
      updates.push(`ai_chatbot_tone = $${paramIndex++}`);
      values.push(data.aiChatbotTone);
    }

    if (data.language !== undefined) {
      updates.push(`language = $${paramIndex++}`);
      values.push(data.language);
    }

    if (data.theme !== undefined) {
      updates.push(`theme = $${paramIndex++}`);
      values.push(data.theme);
    }

    if (updates.length === 0) {
      // No updates, just return current preferences
      const current = await this.getProfile(userId);
      if (!current) {
        throw new Error('User not found');
      }
      return current.preferences;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE user_preferences 
       SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING notifications_enabled, daily_check_in_time, craving_alerts_enabled, ai_chatbot_tone, language, theme`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('User preferences not found');
    }

    const row = result.rows[0];

    logger.info('Preferences updated', { userId });

    return {
      notificationsEnabled: row.notifications_enabled,
      dailyCheckInTime: row.daily_check_in_time,
      cravingAlertsEnabled: row.craving_alerts_enabled,
      aiChatbotTone: row.ai_chatbot_tone,
      language: row.language,
      theme: row.theme,
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Soft delete - set is_active to false
      const result = await client.query(
        'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = true RETURNING id',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found or already deleted');
      }

      await client.query('COMMIT');

      logger.info('Account deleted', { userId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Account deletion failed', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }
}

export const profileService = new ProfileService();
