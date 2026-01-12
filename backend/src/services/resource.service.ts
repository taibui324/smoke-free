import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface Resource {
  id: string;
  title: string;
  description: string;
  content: string | null;
  type: 'article' | 'video' | 'tip';
  category: string;
  url: string | null;
  readingTimeMinutes: number | null;
  tags: string[];
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceWithBookmark extends Resource {
  isBookmarked: boolean;
}

export interface SearchResourcesParams {
  query?: string;
  type?: string;
  category?: string;
  tags?: string[];
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
}

export class ResourceService {
  async getResources(
    userId: string | null,
    params: SearchResourcesParams
  ): Promise<ResourceWithBookmark[]> {
    const {
      query,
      type,
      category,
      tags,
      isFeatured,
      limit = 50,
      offset = 0,
    } = params;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (type) {
      conditions.push(`r.type = $${paramIndex++}`);
      values.push(type);
    }

    if (category) {
      conditions.push(`r.category = $${paramIndex++}`);
      values.push(category);
    }

    if (isFeatured !== undefined) {
      conditions.push(`r.is_featured = $${paramIndex++}`);
      values.push(isFeatured);
    }

    if (tags && tags.length > 0) {
      conditions.push(`r.tags && $${paramIndex++}`);
      values.push(tags);
    }

    if (query) {
      conditions.push(
        `(r.title ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex} OR r.content ILIKE $${paramIndex})`
      );
      values.push(`%${query}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Add user ID for bookmark check if provided
    const bookmarkCheck = userId
      ? `, EXISTS(SELECT 1 FROM user_bookmarks ub WHERE ub.resource_id = r.id AND ub.user_id = $${paramIndex++}) as is_bookmarked`
      : ', false as is_bookmarked';

    if (userId) {
      values.push(userId);
    }

    values.push(limit, offset);

    const sql = `
      SELECT 
        r.id, r.title, r.description, r.content, r.type, r.category, r.url,
        r.reading_time_minutes, r.tags, r.is_featured, r.created_at, r.updated_at
        ${bookmarkCheck}
      FROM resources r
      ${whereClause}
      ORDER BY r.is_featured DESC, r.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await pool.query(sql, values);

    return result.rows.map(this.mapRowToResource);
  }

  async getResourceById(userId: string | null, resourceId: string): Promise<ResourceWithBookmark | null> {
    const values: any[] = [resourceId];
    let paramIndex = 2;

    const bookmarkCheck = userId
      ? `, EXISTS(SELECT 1 FROM user_bookmarks ub WHERE ub.resource_id = r.id AND ub.user_id = $${paramIndex}) as is_bookmarked`
      : ', false as is_bookmarked';

    if (userId) {
      values.push(userId);
    }

    const sql = `
      SELECT 
        r.id, r.title, r.description, r.content, r.type, r.category, r.url,
        r.reading_time_minutes, r.tags, r.is_featured, r.created_at, r.updated_at
        ${bookmarkCheck}
      FROM resources r
      WHERE r.id = $1
    `;

    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToResource(result.rows[0]);
  }

  async bookmarkResource(userId: string, resourceId: string): Promise<boolean> {
    try {
      await pool.query(
        `INSERT INTO user_bookmarks (user_id, resource_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, resource_id) DO NOTHING`,
        [userId, resourceId]
      );

      logger.info('Resource bookmarked', { userId, resourceId });
      return true;
    } catch (error: any) {
      logger.error('Bookmark resource error', { error: error.message, userId, resourceId });
      throw error;
    }
  }

  async removeBookmark(userId: string, resourceId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM user_bookmarks
       WHERE user_id = $1 AND resource_id = $2`,
      [userId, resourceId]
    );

    logger.info('Bookmark removed', { userId, resourceId });
    return (result.rowCount || 0) > 0;
  }

  async getBookmarkedResources(userId: string, limit: number = 50, offset: number = 0): Promise<ResourceWithBookmark[]> {
    const result = await pool.query(
      `SELECT 
        r.id, r.title, r.description, r.content, r.type, r.category, r.url,
        r.reading_time_minutes, r.tags, r.is_featured, r.created_at, r.updated_at,
        true as is_bookmarked
       FROM resources r
       INNER JOIN user_bookmarks ub ON r.id = ub.resource_id
       WHERE ub.user_id = $1
       ORDER BY ub.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(this.mapRowToResource);
  }

  async getDailyTip(): Promise<Resource | null> {
    // Get a random tip
    const result = await pool.query(
      `SELECT 
        id, title, description, content, type, category, url,
        reading_time_minutes, tags, is_featured, created_at, updated_at
       FROM resources
       WHERE type = 'tip'
       ORDER BY RANDOM()
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToResourceWithoutBookmark(result.rows[0]);
  }

  async searchResources(userId: string | null, query: string, limit: number = 20): Promise<ResourceWithBookmark[]> {
    return this.getResources(userId, { query, limit });
  }

  private mapRowToResource(row: any): ResourceWithBookmark {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      content: row.content,
      type: row.type,
      category: row.category,
      url: row.url,
      readingTimeMinutes: row.reading_time_minutes,
      tags: row.tags || [],
      isFeatured: row.is_featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isBookmarked: row.is_bookmarked || false,
    };
  }

  private mapRowToResourceWithoutBookmark(row: any): Resource {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      content: row.content,
      type: row.type,
      category: row.category,
      url: row.url,
      readingTimeMinutes: row.reading_time_minutes,
      tags: row.tags || [],
      isFeatured: row.is_featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const resourceService = new ResourceService();
