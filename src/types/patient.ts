// AcuteHandoff Data Models
// Security: These types enforce the split-stream data architecture

/**
 * Vault A - Patient Identity (RAM ONLY)
 * NEVER persisted to storage. Wiped on app close/refresh.
 * Only transferred via encrypted QR code.
 */
export interface PatientIdentity {
  name: string;
  age: number | null;
  bedNumber: string;
  admissionDate: string;
}

/**
 * Vault B - Clinical Data (Encrypted Storage)
 * Stored in encrypted localStorage.
 * Anonymized before AI processing.
 */
export interface ClinicalData {
  rawDictation: string;
  sbarResult: SBARResult | null;
  differentialDx: string[];
  timestamp: string;
}

/**
 * SBAR Formatted Output
 */
export interface SBARResult {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

/**
 * Handover Audit Log Entry
 * Only stores SHA-256 hash - NEVER raw patient data
 */
export interface HandoverLogEntry {
  hash: string;
  timestamp: string;
  receiverId: string;
  direction: 'sent' | 'received';
}

/**
 * Complete Handover Payload for QR Transfer
 */
export interface HandoverPayload {
  identity: PatientIdentity;
  clinical: ClinicalData;
  sessionToken: string;
  timestamp: string;
}

/**
 * Empty patient identity for initialization
 */
export const emptyPatientIdentity: PatientIdentity = {
  name: '',
  age: null,
  bedNumber: '',
  admissionDate: new Date().toISOString().split('T')[0],
};

/**
 * Empty clinical data for initialization
 */
export const emptyClinicalData: ClinicalData = {
  rawDictation: '',
  sbarResult: null,
  differentialDx: [],
  timestamp: new Date().toISOString(),
};
