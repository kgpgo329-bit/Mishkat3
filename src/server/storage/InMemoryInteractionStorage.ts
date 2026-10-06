import { AskResponse } from '../../shared/types/index.js';

class InMemoryInteractionStorage {
  private store = new Map<string, AskResponse>();
  private sessionIndex = new Map<string, string[]>();

  set(id: string, response: AskResponse): void {
    this.store.set(id, response);

    const sessionId = response.sessionId || 'default_session';
    const currentList = this.sessionIndex.get(sessionId) || [];
    if (!currentList.includes(id)) {
      currentList.push(id);
      this.sessionIndex.set(sessionId, currentList);
    }
  }

  get(id: string): AskResponse | null {
    return this.store.get(id) || null;
  }

  getBySession(sessionId: string): AskResponse[] {
    const ids = this.sessionIndex.get(sessionId) || [];
    const list: AskResponse[] = [];
    for (const id of ids) {
      const item = this.store.get(id);
      if (item) list.push(item);
    }
    return list;
  }

  clear(): void {
    this.store.clear();
    this.sessionIndex.clear();
  }
}

export const interactionStorage = new InMemoryInteractionStorage();
