// AcuteHandoff Data Models
// Security: These types enforce the split-stream data architecture

/**
 * Italian Triage levels (Pronto Soccorso)
 */
export const TRIAGE_LEVELS = ['rosso', 'arancione', 'azzurro', 'verde', 'bianco'] as const;
export type TriageLevel = typeof TRIAGE_LEVELS[number];

export const TRIAGE_LABELS: Record<TriageLevel, string> = {
  'rosso': 'Rosso - Emergenza',
  'arancione': 'Arancione - Urgenza',
  'azzurro': 'Azzurro - Urgenza Differibile',
  'verde': 'Verde - Urgenza Minore',
  'bianco': 'Bianco - Non Urgente',
};

export const TRIAGE_COLORS: Record<TriageLevel, { bg: string; text: string; border: string; glow: string }> = {
  'rosso': { bg: 'bg-triage-rosso/20', text: 'text-triage-rosso', border: 'border-triage-rosso', glow: 'shadow-triage-rosso/50' },
  'arancione': { bg: 'bg-triage-arancione/20', text: 'text-triage-arancione', border: 'border-triage-arancione', glow: 'shadow-triage-arancione/50' },
  'azzurro': { bg: 'bg-triage-azzurro/20', text: 'text-triage-azzurro', border: 'border-triage-azzurro', glow: 'shadow-triage-azzurro/50' },
  'verde': { bg: 'bg-triage-verde/20', text: 'text-triage-verde', border: 'border-triage-verde', glow: 'shadow-triage-verde/50' },
  'bianco': { bg: 'bg-triage-bianco/20', text: 'text-triage-bianco', border: 'border-triage-bianco', glow: 'shadow-triage-bianco/50' },
};

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
 * Pending exams/requests
 */
export const PENDING_TYPES = ['lab', 'imaging', 'consulenza', 'postoLetto'] as const;
export type PendingType = typeof PENDING_TYPES[number];

export const PENDING_LABELS: Record<PendingType, string> = {
  'lab': 'Lab',
  'imaging': 'Imaging',
  'consulenza': 'Consulenza',
  'postoLetto': 'Posto Letto',
};

/**
 * Patient Areas (where patient is located)
 */
export const PATIENT_AREAS = ['OTI', 'OBI', 'ISO', 'Reparto'] as const;
export type PatientArea = typeof PATIENT_AREAS[number];

export const PATIENT_AREA_LABELS: Record<PatientArea, string> = {
  'OTI': 'OTI - Osservazione Temporanea Intensiva',
  'OBI': 'OBI - Osservazione Breve Intensiva',
  'ISO': 'ISO - Isolamento',
  'Reparto': 'Reparto',
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
  triage: TriageLevel;
  area: PatientArea | string | null; // Can be preset or custom
  comorbidities: Comorbidity[];
  allergico: boolean;
  sociale: boolean;
  esito: Esito | null;
}

/**
 * Vault B - Clinical Data (Encrypted Storage)
 * Stored in encrypted localStorage.
 * Manual SBAR entry - no AI processing.
 */
export interface ClinicalData {
  situation: string;      // Situazione
  background: string;     // Anamnesi
  assessment: string;     // Valutazione
  recommendation: string; // Raccomandazione
  pendingExams: PendingType[];
  timestamp: string;
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
 * Archived Patient Record
 * Patients moved here when removed from active list
 */
export interface ArchivedPatient {
  id: string;
  identity: PatientIdentity;
  clinical: ClinicalData;
  reminders: PatientReminder[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string;
}

/**
 * Empty patient identity for initialization
 */
export const emptyPatientIdentity: PatientIdentity = {
  name: '',
  age: null,
  bedNumber: '',
  admissionDate: new Date().toISOString().split('T')[0],
  triage: 'verde',
  area: null,
  comorbidities: [],
  allergico: false,
  sociale: false,
  esito: null,
};

/**
 * Empty clinical data for initialization
 */
export const emptyClinicalData: ClinicalData = {
  situation: '',
  background: '',
  assessment: '',
  recommendation: '',
  pendingExams: [],
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
