export type VerificationStatus =
  | 'SUPPORTED'
  | 'PARTIAL'
  | 'UNSUPPORTED'
  | 'VERIFICATION_FAILED';

export type SufficiencyState = 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT';

export interface EvidenceVerificationResult {
  evidenceId: string;
  claimId: string;
  sourceId: string;
  chunkId: string;
  relation: string;
  verificationStatus: VerificationStatus;
  confidence: number;
}

export interface SufficiencyEvaluation {
  sufficiencyState: SufficiencyState;
  claimCoverage: number; // 0.0 - 1.0
  supportedClaimsCount: number;
  totalClaimsCount: number;
  unsupportedClaims: string[];
}
