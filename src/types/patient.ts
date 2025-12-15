// AcuteHandoff Data Models
// Security: These types enforce the split-stream data architecture

/**
 * Common comorbidities flags
 */
export const COMORBIDITIES = ['BPCO', 'IRC', 'DM2', 'IPA', 'CIC', 'FA'] as const;
export type Comorbidity = typeof COMORBIDITIES[number];

/**
 * Possible outcomes for ER visit
 */
export const ESITI = ['D', 'OB', 'OB/D', 'OB/R', 'R'] as const;
export type Esito = typeof ESITI[number];

export const ESITI_LABELS: Record<Esito, string> = {
  'D': 'Dimesso',
  'OB': 'Osservazione Breve',
  'OB/D': 'OBI → Dimissione',
  'OB/R': 'OBI → Ricovero',
  'R': 'Ricovero',
};

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
  comorbidities: Comorbidity[];
  allergico: boolean;
  sociale: boolean;
  esito: Esito | null;
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
 * Patient Reminder/Alarm
 */
export interface PatientReminder {
  id: string;
  time: string; // HH:mm format
  message: string;
  triggered: boolean;
}

/**
 * Complete Patient Record for list management
 */
export interface PatientRecord {
  id: string;
  identity: PatientIdentity;
  clinical: ClinicalData;
  reminders: PatientReminder[];
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
  comorbidities: [],
  allergico: false,
  sociale: false,
  esito: null,
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
    reminders: [],
    createdAt: now,
    updatedAt: now,
  };
}
