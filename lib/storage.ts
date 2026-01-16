/**
 * Storage abstraction layer
 * Supports both MongoDB (via Prisma) and in-memory storage
 */

import type { ChatMessage, ChatImage } from '@/types/chat';

export interface ImageData {
  id: string;
  data: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface SessionData {
  id: string;
  sessionId: string;
  messages: MessageData[];
  createdAt: Date;
  expiresAt: Date;
}

export interface MessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: ImageData[];
  createdAt: Date;
}

export interface StorageAdapter {
  // Session operations
  createSession(sessionId: string, expiresAt: Date): Promise<SessionData>;
  getSession(sessionId: string): Promise<SessionData | null>;
  deleteSession(sessionId: string): Promise<void>;

  // Message operations
  addMessage(sessionId: string, message: ChatMessage): Promise<MessageData>;
  getMessages(sessionId: string): Promise<MessageData[]>;

  // Cleanup
  deleteExpiredSessions(): Promise<number>;
}

/**
 * In-Memory Storage Implementation
 */
class InMemoryStorage implements StorageAdapter {
  private sessions: Map<string, SessionData> = new Map();
  private messageIdCounter = 0;

  async createSession(sessionId: string, expiresAt: Date): Promise<SessionData> {
    const session: SessionData = {
      id: sessionId,
      sessionId,
      messages: [],
      createdAt: new Date(),
      expiresAt,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<MessageData> {
    let session = await this.getSession(sessionId);

    if (!session) {
      // Create session if it doesn't exist
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
      session = await this.createSession(sessionId, expiresAt);
    }

    const messageData: MessageData = {
      id: `msg_${++this.messageIdCounter}`,
      role: message.role,
      content: message.content,
      images: message.images?.map((img, idx) => ({
        id: `img_${this.messageIdCounter}_${idx}`,
        data: img.data,
        mimeType: img.mimeType,
        size: img.size,
        createdAt: new Date(),
      })),
      createdAt: new Date(),
    };

    session.messages.push(messageData);
    return messageData;
  }

  async getMessages(sessionId: string): Promise<MessageData[]> {
    const session = await this.getSession(sessionId);
    return session?.messages || [];
  }

  async deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    return count;
  }
}

/**
 * MongoDB Storage Implementation (via Prisma)
 */
class MongoDBStorage implements StorageAdapter {
  private prisma: typeof import('./prisma').prisma;

  constructor(prismaClient: typeof import('./prisma').prisma) {
    this.prisma = prismaClient;
  }

  async createSession(sessionId: string, expiresAt: Date): Promise<SessionData> {
    const session = await this.prisma.session.create({
      data: {
        sessionId,
        expiresAt,
      },
      include: {
        messages: true,
      },
    });

    return this.mapSession(session);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.prisma.session.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            images: true,
          },
        },
      },
    });

    if (!session) return null;
    return this.mapSession(session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.session.delete({
      where: { sessionId },
    });
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<MessageData> {
    // Ensure session exists
    let session = await this.prisma.session.findUnique({
      where: { sessionId },
    });

    if (!session) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      session = await this.prisma.session.create({
        data: {
          sessionId,
          expiresAt,
        },
      });
    }

    const messageData = await this.prisma.message.create({
      data: {
        sessionId: session.id,
        role: message.role,
        content: message.content,
        images: message.images ? {
          create: message.images.map((img) => ({
            data: img.data,
            mimeType: img.mimeType,
            size: img.size,
          })),
        } : undefined,
      },
      include: {
        images: true,
      },
    });

    return {
      id: messageData.id,
      role: messageData.role as 'user' | 'assistant',
      content: messageData.content,
      images: messageData.images?.map((img) => ({
        id: img.id,
        data: img.data,
        mimeType: img.mimeType,
        size: img.size,
        createdAt: img.createdAt,
      })),
      createdAt: messageData.createdAt,
    };
  }

  async getMessages(sessionId: string): Promise<MessageData[]> {
    const session = await this.getSession(sessionId);
    return session?.messages || [];
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  private mapSession(session: {
    id: string;
    sessionId: string;
    messages?: Array<{
      id: string;
      role: string;
      content: string;
      images?: Array<{
        id: string;
        data: string;
        mimeType: string;
        size: number;
        createdAt: Date;
      }>;
      createdAt: Date;
    }>;
    createdAt: Date;
    expiresAt: Date;
  }): SessionData {
    return {
      id: session.id,
      sessionId: session.sessionId,
      messages: session.messages?.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        images: msg.images?.map((img) => ({
          id: img.id,
          data: img.data,
          mimeType: img.mimeType,
          size: img.size,
          createdAt: img.createdAt,
        })),
        createdAt: msg.createdAt,
      })) || [],
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    };
  }
}

/**
 * Get storage adapter based on environment
 */
let storageInstance: StorageAdapter | null = null;

export async function getStorage(): Promise<StorageAdapter> {
  if (storageInstance) {
    return storageInstance;
  }

  // Try to connect to MongoDB with timeout
  try {
    const { prisma } = await import('./prisma');

    // Test actual connection with a simple query and timeout
    const testConnection = prisma.$runCommandRaw({
      ping: 1
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 3000);
    });

    await Promise.race([testConnection, timeoutPromise]);

    console.log('[Storage] Using MongoDB storage');
    storageInstance = new MongoDBStorage(prisma);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[Storage] MongoDB not available (${errorMsg}), using in-memory storage`);
    console.warn('[Storage] Note: Data will be lost when server restarts');
    storageInstance = new InMemoryStorage();
  }

  return storageInstance;
}

/**
 * Reset storage instance (for testing)
 */
export function resetStorage() {
  storageInstance = null;
}
