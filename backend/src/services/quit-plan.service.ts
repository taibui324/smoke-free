import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface QuitPlan {
  id: string;
  userId: string;
  quitDate: Date;
  cigarettesPerDay: number;
  costPerPack: number;
  cigarettesPerPack: number;
  motivations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuitPlanData {
  quitDate: Date;
  cigarettesPerDay: number;
  costPerPack: number;
  cigarettesPerPack?: number;
  motivations: string[];
}

export interface UpdateQuitPlanData {
  quitDate?: Date;
  cigarettesPerDay?: number;
  costPerPack?: number;
  cigarettesPerPack?: number;
  motivations?: string[];
}

export class QuitPlanService {
  async createQuitPlan(userId: string, data: CreateQuitPlanData): Promise<QuitPlan> {
    // Validate quit date is within next 14 days
    const now = new Date();
    const maxDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const quitDate = new Date(data.quitDate);

    if (quitDate > maxDate) {
      throw new Error('Quit date must be within the next 14 days');
    }

    if (quitDate < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
      throw new Error('Quit date cannot be in the past');
    }

    const result = await pool.query(
      `INSERT INTO quit_plans (user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations, created_at, updated_at`,
      [
        userId,
        data.quitDate,
        data.cigarettesPerDay,
        data.costPerPack,
        data.cigarettesPerPack || 20,
        data.motivations,
      ]
    );

    const row = result.rows[0];

    logger.info('Quit plan created', { userId, quitDate: data.quitDate });

    return {
      id: row.id,
      userId: row.user_id,
      quitDate: row.quit_date,
      cigarettesPerDay: row.cigarettes_per_day,
      costPerPack: parseFloat(row.cost_per_pack),
      cigarettesPerPack: row.cigarettes_per_pack,
      motivations: row.motivations,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getQuitPlan(userId: string): Promise<QuitPlan | null> {
    const result = await pool.query(
      `SELECT id, user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations, created_at, updated_at
       FROM quit_plans
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      quitDate: row.quit_date,
      cigarettesPerDay: row.cigarettes_per_day,
      costPerPack: parseFloat(row.cost_per_pack),
      cigarettesPerPack: row.cigarettes_per_pack,
      motivations: row.motivations,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateQuitPlan(userId: string, data: UpdateQuitPlanData): Promise<QuitPlan> {
    // Validate quit date if provided
    if (data.quitDate) {
      const now = new Date();
      const maxDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const quitDate = new Date(data.quitDate);

      if (quitDate > maxDate) {
        throw new Error('Quit date must be within the next 14 days');
      }

      if (quitDate < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
        throw new Error('Quit date cannot be in the past');
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.quitDate !== undefined) {
      updates.push(`quit_date = $${paramIndex++}`);
      values.push(data.quitDate);
    }

    if (data.cigarettesPerDay !== undefined) {
      updates.push(`cigarettes_per_day = $${paramIndex++}`);
      values.push(data.cigarettesPerDay);
    }

    if (data.costPerPack !== undefined) {
      updates.push(`cost_per_pack = $${paramIndex++}`);
      values.push(data.costPerPack);
    }

    if (data.cigarettesPerPack !== undefined) {
      updates.push(`cigarettes_per_pack = $${paramIndex++}`);
      values.push(data.cigarettesPerPack);
    }

    if (data.motivations !== undefined) {
      updates.push(`motivations = $${paramIndex++}`);
      values.push(data.motivations);
    }

    if (updates.length === 0) {
      // No updates, just return current quit plan
      const current = await this.getQuitPlan(userId);
      if (!current) {
        throw new Error('Quit plan not found');
      }
      return current;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE quit_plans 
       SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING id, user_id, quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack, motivations, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Quit plan not found');
    }

    const row = result.rows[0];

    logger.info('Quit plan updated', { userId });

    return {
      id: row.id,
      userId: row.user_id,
      quitDate: row.quit_date,
      cigarettesPerDay: row.cigarettes_per_day,
      costPerPack: parseFloat(row.cost_per_pack),
      cigarettesPerPack: row.cigarettes_per_pack,
      motivations: row.motivations,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  calculateSavings(quitPlan: QuitPlan): {
    dailySavings: number;
    weeklySavings: number;
    monthlySavings: number;
    yearlySavings: number;
  } {
    const packsPerDay = quitPlan.cigarettesPerDay / quitPlan.cigarettesPerPack;
    const dailySavings = packsPerDay * quitPlan.costPerPack;

    return {
      dailySavings: Math.round(dailySavings * 100) / 100,
      weeklySavings: Math.round(dailySavings * 7 * 100) / 100,
      monthlySavings: Math.round(dailySavings * 30 * 100) / 100,
      yearlySavings: Math.round(dailySavings * 365 * 100) / 100,
    };
  }
}

export const quitPlanService = new QuitPlanService();
