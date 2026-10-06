import { AskResponse } from '../../shared/types/index.js';
import { getFirestoreDb } from '../config/firebase.js';
import { doc, setDoc } from 'firebase/firestore';

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

    // Persist to Cloud Firestore
    try {
      const db = getFirestoreDb();
      const docRef = doc(db, 'interactions', id);
      setDoc(docRef, response).catch((err) => {
        console.warn(`[Firestore] Sync interaction ${id} warning:`, err?.message || err);
      });
    } catch (e: any) {
      console.warn(`[Firestore] Interaction store initialization warning:`, e?.message || e);
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
