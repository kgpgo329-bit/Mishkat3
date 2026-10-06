export interface UserSession {
  sessionId: string;
  createdAt: string;
  lastActiveAt: string;
  metadata?: Record<string, unknown>;
}

export interface ISessionStorage {
  getOrCreateSession(sessionId: string): Promise<UserSession>;
  getSession(sessionId: string): Promise<UserSession | null>;
  updateLastActive(sessionId: string): Promise<void>;
}
