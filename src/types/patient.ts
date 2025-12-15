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
 * SBAR Formatted Output (Italian)
 */
export interface SBARResult {
  situation: string;    // Situazione
  background: string;   // Anamnesi
  assessment: string;   // Valutazione
  recommendation: string; // Raccomandazione
}

/**
 * Complete Patient Record for list management
 */
export interface PatientRecord {
  id: string;
  identity: PatientIdentity;
  clinical: ClinicalData;
  createdAt: string;
  updatedAt: string;
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

/**
 * Create a new patient record
 */
export function createPatientRecord(
  identity: PatientIdentity = emptyPatientIdentity,
  clinical: ClinicalData = emptyClinicalData
): PatientRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    identity,
    clinical,
    createdAt: now,
    updatedAt: now,
  };
}
