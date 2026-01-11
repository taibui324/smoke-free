import { logger } from '../utils/logger';
import { quitPlanService } from './quit-plan.service';

export interface SmokeFreeDuration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
}

export interface UserStatistics {
  smokeFreeTime: SmokeFreeDuration;
  moneySaved: number;
  cigarettesNotSmoked: number;
  lifeRegained: {
    minutes: number;
    hours: number;
    days: number;
  };
  currentStreak: number;
  quitDate: Date;
}

export class StatisticsService {
  /**
   * Calculate smoke-free duration from quit date
   */
  calculateSmokeFreeTime(quitDate: Date): SmokeFreeDuration {
    const now = new Date();
    const quitTime = new Date(quitDate);
    
    // If quit date is in the future, return zeros
    if (quitTime > now) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        totalMinutes: 0,
        totalHours: 0,
        totalDays: 0,
      };
    }

    const totalMilliseconds = now.getTime() - quitTime.getTime();
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const days = totalDays;
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      totalMinutes,
      totalHours,
      totalDays,
    };
  }

  /**
   * Calculate money saved based on quit plan and time smoke-free
   */
  calculateMoneySaved(
    cigarettesPerDay: number,
    costPerPack: number,
    cigarettesPerPack: number,
    smokeFreeTime: SmokeFreeDuration
  ): number {
    const packsPerDay = cigarettesPerDay / cigarettesPerPack;
    const costPerDay = packsPerDay * costPerPack;
    const totalDays = smokeFreeTime.totalDays + smokeFreeTime.hours / 24;
    const moneySaved = costPerDay * totalDays;

    return Math.round(moneySaved * 100) / 100;
  }

  /**
   * Calculate cigarettes not smoked
   */
  calculateCigarettesNotSmoked(
    cigarettesPerDay: number,
    smokeFreeTime: SmokeFreeDuration
  ): number {
    const totalDays = smokeFreeTime.totalDays + smokeFreeTime.hours / 24;
    const cigarettesNotSmoked = cigarettesPerDay * totalDays;

    return Math.floor(cigarettesNotSmoked);
  }

  /**
   * Calculate life regained (average: 11 minutes per cigarette)
   */
  calculateLifeRegained(cigarettesNotSmoked: number): {
    minutes: number;
    hours: number;
    days: number;
  } {
    const MINUTES_PER_CIGARETTE = 11;
    const totalMinutes = cigarettesNotSmoked * MINUTES_PER_CIGARETTE;
    const hours = Math.floor(totalMinutes / 60);
    const days = Math.floor(hours / 24);

    return {
      minutes: totalMinutes,
      hours,
      days,
    };
  }

  /**
   * Get comprehensive statistics for a user
   */
  async getUserStatistics(userId: string): Promise<UserStatistics | null> {
    // Get user's quit plan
    const quitPlan = await quitPlanService.getQuitPlan(userId);

    if (!quitPlan) {
      return null;
    }

    // Calculate smoke-free time
    const smokeFreeTime = this.calculateSmokeFreeTime(quitPlan.quitDate);

    // Calculate money saved
    const moneySaved = this.calculateMoneySaved(
      quitPlan.cigarettesPerDay,
      quitPlan.costPerPack,
      quitPlan.cigarettesPerPack,
      smokeFreeTime
    );

    // Calculate cigarettes not smoked
    const cigarettesNotSmoked = this.calculateCigarettesNotSmoked(
      quitPlan.cigarettesPerDay,
      smokeFreeTime
    );

    // Calculate life regained
    const lifeRegained = this.calculateLifeRegained(cigarettesNotSmoked);

    // Current streak is the same as total days smoke-free
    const currentStreak = smokeFreeTime.totalDays;

    logger.debug('Statistics calculated', { userId, smokeFreeTime, moneySaved });

    return {
      smokeFreeTime,
      moneySaved,
      cigarettesNotSmoked,
      lifeRegained,
      currentStreak,
      quitDate: quitPlan.quitDate,
    };
  }

  /**
   * Get just the smoke-free timer (for real-time updates)
   */
  async getSmokeFreeTimer(userId: string): Promise<SmokeFreeDuration | null> {
    const quitPlan = await quitPlanService.getQuitPlan(userId);

    if (!quitPlan) {
      return null;
    }

    return this.calculateSmokeFreeTime(quitPlan.quitDate);
  }
}

export const statisticsService = new StatisticsService();
