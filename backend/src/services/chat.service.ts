import OpenAI from 'openai';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { statisticsService } from './statistics.service';

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  createdAt: Date;
}

export interface SendMessageData {
  message: string;
  includeContext?: boolean;
}

export interface ChatResponse {
  message: ChatMessage;
  assistantMessage: ChatMessage;
}

export class ChatService {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
    });

    this.systemPrompt = `You are an empathetic AI coach helping people quit smoking. Your role is to:
- Provide emotional support and encouragement
- Offer evidence-based coping strategies for cravings
- Celebrate milestones and progress
- Provide health information about quitting smoking
- Guide users through breathing exercises and relaxation techniques
- Detect crisis language and recommend professional help when needed

Be warm, supportive, and non-judgmental. Keep responses concise (2-3 paragraphs max).
If you detect crisis language (suicidal thoughts, severe depression), immediately recommend contacting a crisis hotline.`;
  }

  async sendMessage(userId: string, data: SendMessageData): Promise<ChatResponse> {
    // Save user message
    const userMessage = await this.saveMessage(userId, 'user', data.message);

    // Get conversation history
    const history = await this.getChatHistory(userId, 10);

    // Build messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt },
    ];

    // Add context if requested
    if (data.includeContext) {
      const context = await this.getUserContext(userId);
      if (context) {
        messages.push({
          role: 'system',
          content: `User context: ${context}`,
        });
      }
    }

    // Add conversation history (excluding the current message)
    history
      .filter((msg) => msg.id !== userMessage.id)
      .reverse()
      .forEach((msg) => {
        messages.push({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        });
      });

    // Add current user message
    messages.push({ role: 'user', content: data.message });

    // Call OpenAI API
    let assistantContent: string;
    let metadata: any = {};

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      assistantContent = completion.choices[0].message.content || 'I apologize, but I encountered an error. Please try again.';
      metadata = {
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens,
        finishReason: completion.choices[0].finish_reason,
      };

      logger.info('OpenAI chat completion', {
        userId,
        tokensUsed: completion.usage?.total_tokens,
      });
    } catch (error: any) {
      logger.error('OpenAI API error', { error: error.message, userId });
      
      // Fallback response if OpenAI fails
      assistantContent = this.getFallbackResponse(data.message);
      metadata = { error: 'OpenAI API unavailable', fallback: true };
    }

    // Save assistant message
    const assistantMessage = await this.saveMessage(
      userId,
      'assistant',
      assistantContent,
      metadata
    );

    return {
      message: userMessage,
      assistantMessage,
    };
  }

  async getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    const result = await pool.query(
      `SELECT id, user_id, role, content, metadata, created_at
       FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(this.mapRowToChatMessage);
  }

  async deleteChatHistory(userId: string): Promise<number> {
    const result = await pool.query(
      `DELETE FROM chat_messages WHERE user_id = $1`,
      [userId]
    );

    logger.info('Chat history deleted', { userId, count: result.rowCount });

    return result.rowCount || 0;
  }

  private async saveMessage(
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any
  ): Promise<ChatMessage> {
    const result = await pool.query(
      `INSERT INTO chat_messages (user_id, role, content, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, role, content, metadata, created_at`,
      [userId, role, content, metadata ? JSON.stringify(metadata) : null]
    );

    return this.mapRowToChatMessage(result.rows[0]);
  }

  private async getUserContext(userId: string): Promise<string | null> {
    try {
      // Get user statistics
      const stats = await statisticsService.getUserStatistics(userId);
      if (!stats) {
        return null;
      }

      const context = `The user has been smoke-free for ${stats.smokeFreeTime.days} days, ${stats.smokeFreeTime.hours} hours. They have saved $${stats.moneySaved.toFixed(2)} and avoided ${stats.cigarettesNotSmoked} cigarettes.`;

      return context;
    } catch (error) {
      logger.error('Error getting user context', { error, userId });
      return null;
    }
  }

  private getFallbackResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();

    // Detect craving-related messages
    if (lowerMessage.includes('craving') || lowerMessage.includes('urge') || lowerMessage.includes('want to smoke')) {
      return `I understand you're experiencing a craving right now. Remember, cravings typically last only 3-5 minutes. Try these quick techniques:

1. Take 10 deep breaths - breathe in slowly through your nose, hold for 3 seconds, exhale through your mouth
2. Drink a glass of water slowly
3. Go for a short walk or do some light stretching
4. Call a supportive friend or family member

You've come so far - you can get through this moment! What coping strategy would you like to try first?`;
    }

    // Detect progress inquiries
    if (lowerMessage.includes('progress') || lowerMessage.includes('how am i doing') || lowerMessage.includes('stats')) {
      return `I'd love to share your progress with you! You can view your detailed statistics on the progress screen, including your smoke-free time, money saved, and health improvements. Every day smoke-free is a victory worth celebrating!`;
    }

    // Detect breathing exercise requests
    if (lowerMessage.includes('breathing') || lowerMessage.includes('breathe') || lowerMessage.includes('relax')) {
      return `Let's do a calming breathing exercise together:

1. Find a comfortable position and close your eyes if you'd like
2. Breathe in slowly through your nose for 4 counts
3. Hold your breath for 4 counts
4. Exhale slowly through your mouth for 6 counts
5. Repeat this cycle 5 times

This technique activates your body's relaxation response and can help reduce cravings. How are you feeling now?`;
    }

    // Default supportive response
    return `Thank you for reaching out. I'm here to support you on your quit smoking journey. Whether you're dealing with a craving, want to celebrate your progress, or just need someone to talk to, I'm here for you.

How can I help you today? You can ask me about:
- Coping strategies for cravings
- Your progress and statistics
- Breathing exercises and relaxation techniques
- Health benefits of quitting
- Or just chat about how you're feeling`;
  }

  private mapRowToChatMessage(row: any): ChatMessage {
    return {
      id: row.id,
      userId: row.user_id,
      role: row.role,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }
}

export const chatService = new ChatService();
