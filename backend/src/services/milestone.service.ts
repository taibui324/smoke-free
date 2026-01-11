import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { statisticsService } from './statistics.service';

export interface Milestone {
  id: string;
  name: string;
  description: string;
  durationHours: number;
  category: 'time' | 'health' | 'savings' | 'achievement';
  icon: string | null;
  createdAt: Date;
}

export interface UserMilestone {
  id: string;
  userId: string;
  milestoneId: string;
  unlockedAt: Date;
  shared: boolean;
  milestone: Milestone;
}

export interface MilestoneProgress {
  milestone: Milestone;
  unlocked: boolean;
  unlockedAt: Date | null;
  progress: number; // 0-100 percentage
  timeRemaining: {
    hours: number;
    days: number;
  } | null;
}

export class MilestoneService {
  async getAllMilestones(): Promise<Milestone[]> {
    const result = await pool.query(
      `SELECT id, name, description, duration_hours, category, icon, created_at
       FROM milestones
       ORDER BY duration_hours ASC, category ASC`
    );

    return result.rows.map(this.mapRowToMilestone);
  }

  async getUserMilestones(userId: string): Promise<UserMilestone[]> {
    const result = await pool.query(
      `SELECT 
        um.id, um.user_id, um.milestone_id, um.unlocked_at, um.shared,
        m.id as m_id, m.name, m.description, m.duration_hours, m.category, m.icon, m.created_at
       FROM user_milestones um
       JOIN milestones m ON um.milestone_id = m.id
       WHERE um.user_id = $1
       ORDER BY um.unlocked_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      milestoneId: row.milestone_id,
      unlockedAt: row.unlocked_at,
      shared: row.shared,
      milestone: {
        id: row.m_id,
        name: row.name,
        description: row.description,
        durationHours: row.duration_hours,
        category: row.category,
        icon: row.icon,
        createdAt: row.created_at,
      },
    }));
  }

  async getMilestoneProgress(userId: string): Promise<MilestoneProgress[]> {
    // Get quit plan to calculate progress
    const quitPlanResult = await pool.query(
      `SELECT quit_date, cigarettes_per_day, cost_per_pack, cigarettes_per_pack
       FROM quit_plans
       WHERE user_id = $1`,
      [userId]
    );

    if (quitPlanResult.rows.length === 0) {
      return [];
    }

    const quitPlan = quitPlanResult.rows[0];
    const quitDate = new Date(quitPlan.quit_date);
    const now = new Date();
    const hoursSinceQuit = Math.max(0, (now.getTime() - quitDate.getTime()) / (1000 * 60 * 60));

    // Get all milestones
    const milestones = await this.getAllMilestones();

    // Get user's unlocked milestones
    const unlockedResult = await pool.query(
      `SELECT milestone_id, unlocked_at
       FROM user_milestones
       WHERE user_id = $1`,
      [userId]
    );

    const unlockedMap = new Map(
      unlockedResult.rows.map((row) => [row.milestone_id, row.unlocked_at])
    );

    // Get statistics for achievement and savings milestones
    const stats = await statisticsService.getUserStatistics(userId);
    const cravingsResult = await pool.query(
      `SELECT COUNT(*) as count FROM cravings WHERE user_id = $1 AND resolved = true`,
      [userId]
    );
    const resolvedCravings = parseInt(cravingsResult.rows[0].count);

    // Calculate progress for each milestone
    const progress: MilestoneProgress[] = milestones.map((milestone) => {
      const unlockedAt = unlockedMap.get(milestone.id);
      const unlocked = !!unlockedAt;

      let progressPercent = 0;
      let timeRemaining = null;

      if (milestone.category === 'time' || milestone.category === 'health') {
        // Time-based milestones
        if (milestone.durationHours > 0) {
          progressPercent = Math.min(100, (hoursSinceQuit / milestone.durationHours) * 100);
          if (!unlocked && hoursSinceQuit < milestone.durationHours) {
            const hoursRemaining = milestone.durationHours - hoursSinceQuit;
            timeRemaining = {
              hours: Math.ceil(hoursRemaining),
              days: Math.ceil(hoursRemaining / 24),
            };
          }
        } else {
          // Instant milestones (20 minutes)
          progressPercent = hoursSinceQuit >= milestone.durationHours ? 100 : 0;
        }
      } else if (milestone.category === 'achievement') {
        // Achievement milestones based on cravings
        if (milestone.name.includes('First Craving')) {
          progressPercent = resolvedCravings >= 1 ? 100 : 0;
        } else if (milestone.name.includes('10 Cravings')) {
          progressPercent = Math.min(100, (resolvedCravings / 10) * 100);
        } else if (milestone.name.includes('50 Cravings')) {
          progressPercent = Math.min(100, (resolvedCravings / 50) * 100);
        } else if (milestone.name.includes('100 Cravings')) {
          progressPercent = Math.min(100, (resolvedCravings / 100) * 100);
        }
      } else if (milestone.category === 'savings' && stats) {
        // Savings milestones
        const moneySaved = stats.moneySaved;
        if (milestone.name.includes('$50')) {
          progressPercent = Math.min(100, (moneySaved / 50) * 100);
        } else if (milestone.name.includes('$100')) {
          progressPercent = Math.min(100, (moneySaved / 100) * 100);
        } else if (milestone.name.includes('$500')) {
          progressPercent = Math.min(100, (moneySaved / 500) * 100);
        } else if (milestone.name.includes('$1000')) {
          progressPercent = Math.min(100, (moneySaved / 1000) * 100);
        }
      }

      return {
        milestone,
        unlocked,
        unlockedAt: unlockedAt || null,
        progress: Math.round(progressPercent),
        timeRemaining,
      };
    });

    return progress;
  }

  async checkAndUnlockMilestones(userId: string): Promise<UserMilestone[]> {
    const progress = await this.getMilestoneProgress(userId);
    const newlyUnlocked: UserMilestone[] = [];

    for (const item of progress) {
      if (!item.unlocked && item.progress >= 100) {
        // Unlock this milestone
        try {
          const result = await pool.query(
            `INSERT INTO user_milestones (user_id, milestone_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, milestone_id) DO NOTHING
             RETURNING id, user_id, milestone_id, unlocked_at, shared`,
            [userId, item.milestone.id]
          );

          if (result.rows.length > 0) {
            const row = result.rows[0];
            newlyUnlocked.push({
              id: row.id,
              userId: row.user_id,
              milestoneId: row.milestone_id,
              unlockedAt: row.unlocked_at,
              shared: row.shared,
              milestone: item.milestone,
            });

            logger.info('Milestone unlocked', {
              userId,
              milestoneId: item.milestone.id,
              milestoneName: item.milestone.name,
            });
          }
        } catch (error: any) {
          // Ignore duplicate key errors
          if (!error.message.includes('duplicate key')) {
            throw error;
          }
        }
      }
    }

    return newlyUnlocked;
  }

  async shareMilestone(userId: string, milestoneId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE user_milestones
       SET shared = true
       WHERE user_id = $1 AND milestone_id = $2
       RETURNING id`,
      [userId, milestoneId]
    );

    return result.rows.length > 0;
  }

  async getBestStreak(userId: string): Promise<number> {
    // For now, return current streak
    // In a full implementation, this would track relapses and calculate best streak
    const stats = await statisticsService.getUserStatistics(userId);
    return stats ? stats.currentStreak : 0;
  }

  private mapRowToMilestone(row: any): Milestone {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      durationHours: row.duration_hours,
      category: row.category,
      icon: row.icon,
      createdAt: row.created_at,
    };
  }
}

export const milestoneService = new MilestoneService();
