import { InteractionRecord, AskResponse } from '../../shared/types/index.js';

export interface InteractionDetailRecord extends InteractionRecord {
  fullResponse?: AskResponse;
}

export interface IInteractionStorage {
  saveInteraction(interaction: InteractionDetailRecord): Promise<void>;
  getInteractionById(sessionId: string, interactionId: string): Promise<InteractionDetailRecord | null>;
  getInteractionsBySession(sessionId: string): Promise<InteractionRecord[]>;
}
