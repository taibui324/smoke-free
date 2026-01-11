import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface Craving {
  id: string;
  userId: string;
  intensity: number;
  triggers: string[];
  reliefTechniquesUsed: string[];
  duration?: number;
  notes?: string;
  resolved: boolean;
  createdAt: Date;
}

export interface CreateCravingData {
  intensity: number;
  triggers: string[];
  reliefTechniquesUsed?: string[];
  notes?: string;
}

export interface CravingAnalytics {
  totalCravings: number;
  averageIntensity: number;
  mostCommonTriggers: Array<{ trigger: string; count: number }>;
  cravingsByDay: Array<{ date: string; count: number }>;
  resolutionRate: number;
}

export class CravingService {
  async createCraving(userId: string, data: CreateCravingData): Promise<Craving> {
    const result = await pool.query(
      `INSERT INTO cravings (user_id, intensity, triggers, relief_techniques_used, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, intensity, triggers, relief_techniques_used, duration, notes, resolved, created_at`,
      [userId, data.intensity, data.triggers, data.reliefTechniquesUsed || [], data.notes]
    );

    const row = result.rows[0];

    logger.info('Craving logged', { userId, intensity: data.intensity });

    return this.mapRowToCraving(row);
  }

  async getCravings(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Craving[]> {
    const result = await pool.query(
      `SELECT id, user_id, intensity, triggers, relief_techniques_used, duration, notes, resolved, created_at
       FROM cravings
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(this.mapRowToCraving);
  }

  async getCravingById(userId: string, cravingId: string): Promise<Craving | null> {
    const result = await pool.query(
      `SELECT id, user_id, intensity, triggers, relief_techniques_used, duration, notes, resolved, created_at
       FROM cravings
       WHERE id = $1 AND user_id = $2`,
      [cravingId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCraving(result.rows[0]);
  }

  async updateCraving(
    userId: string,
    cravingId: string,
    data: { resolved?: boolean; duration?: number; reliefTechniquesUsed?: string[] }
  ): Promise<Craving | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.resolved !== undefined) {
      updates.push(`resolved = $${paramIndex++}`);
      values.push(data.resolved);
    }

    if (data.duration !== undefined) {
      updates.push(`duration = $${paramIndex++}`);
      values.push(data.duration);
    }

    if (data.reliefTechniquesUsed !== undefined) {
      updates.push(`relief_techniques_used = $${paramIndex++}`);
      values.push(data.reliefTechniquesUsed);
    }

    if (updates.length === 0) {
      return this.getCravingById(userId, cravingId);
    }

    values.push(cravingId, userId);

    const result = await pool.query(
      `UPDATE cravings 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING id, user_id, intensity, triggers, relief_techniques_used, duration, notes, resolved, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCraving(result.rows[0]);
  }

  async getAnalytics(userId: string, days: number = 30): Promise<CravingAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total cravings and average intensity
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_cravings,
        AVG(intensity) as avg_intensity,
        COUNT(CASE WHEN resolved = true THEN 1 END) as resolved_count
       FROM cravings
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, startDate]
    );

    const stats = statsResult.rows[0];
    const totalCravings = parseInt(stats.total_cravings);
    const averageIntensity = parseFloat(stats.avg_intensity) || 0;
    const resolvedCount = parseInt(stats.resolved_count);
    const resolutionRate = totalCravings > 0 ? (resolvedCount / totalCravings) * 100 : 0;

    // Get most common triggers
    const triggersResult = await pool.query(
      `SELECT unnest(triggers) as trigger, COUNT(*) as count
       FROM cravings
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY trigger
       ORDER BY count DESC
       LIMIT 10`,
      [userId, startDate]
    );

    const mostCommonTriggers = triggersResult.rows.map((row) => ({
      trigger: row.trigger,
      count: parseInt(row.count),
    }));

    // Get cravings by day
    const byDayResult = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
       FROM cravings
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [userId, startDate]
    );

    const cravingsByDay = byDayResult.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      count: parseInt(row.count),
    }));

    return {
      totalCravings,
      averageIntensity: Math.round(averageIntensity * 10) / 10,
      mostCommonTriggers,
      cravingsByDay,
      resolutionRate: Math.round(resolutionRate * 10) / 10,
    };
  }

  async getTriggerSummary(userId: string): Promise<Array<{ trigger: string; count: number }>> {
    const result = await pool.query(
      `SELECT unnest(triggers) as trigger, COUNT(*) as count
       FROM cravings
       WHERE user_id = $1
       GROUP BY trigger
       ORDER BY count DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      trigger: row.trigger,
      count: parseInt(row.count),
    }));
  }

  private mapRowToCraving(row: any): Craving {
    return {
      id: row.id,
      userId: row.user_id,
      intensity: row.intensity,
      triggers: row.triggers,
      reliefTechniquesUsed: row.relief_techniques_used,
      duration: row.duration,
      notes: row.notes,
      resolved: row.resolved,
      createdAt: row.created_at,
    };
  }
}

export const cravingService = new CravingService();
