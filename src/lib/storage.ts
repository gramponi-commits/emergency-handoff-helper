// Storage Service for AcuteHandoff
// Handles encrypted persistence of Vault B (Clinical Data) and Patient List
// Security: All data validated with Zod schemas after JSON.parse()

import { ClinicalData, HandoverLogEntry, PatientRecord, PatientReminder, PatientIdentity, ArchivedPatient } from '@/types/patient';
import { encryptData, decryptData } from './crypto';
import { 
  ClinicalDataSchema, 
  PatientListClinicalSchema, 
  HandoverLogEntrySchema,
  PatientIdentitySchema,
  ArchivedPatientSchema 
} from '@/types/patient-schemas';
import { z } from 'zod';

const CLINICAL_DATA_KEY = 'acutehandoff-clinical';
const AUDIT_LOG_KEY = 'acutehandoff-audit';
const PATIENT_LIST_KEY = 'acutehandoff-patients';
const IDENTITIES_KEY = 'acutehandoff-identities';
const ARCHIVE_KEY = 'acutehandoff-archive';

/**
 * Save clinical data to encrypted localStorage
 */
export async function saveClinicalData(data: ClinicalData): Promise<void> {
  try {
    const encrypted = await encryptData(JSON.stringify(data));
    localStorage.setItem(CLINICAL_DATA_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save clinical data:', error);
    throw new Error('Failed to save clinical data securely');
  }
}

/**
 * Load clinical data from encrypted localStorage with Zod validation
 */
export async function loadClinicalData(): Promise<ClinicalData | null> {
  try {
    const encrypted = localStorage.getItem(CLINICAL_DATA_KEY);
    if (!encrypted) return null;
    
    const decrypted = await decryptData(encrypted);
    const rawData = JSON.parse(decrypted);
    
    // Validate with Zod schema
    const result = ClinicalDataSchema.safeParse(rawData);
    if (!result.success) {
      console.error('Invalid clinical data format:', result.error);
      return null;
    }
    
    return result.data as ClinicalData;
  } catch (error) {
    console.error('Failed to load clinical data:', error);
    return null;
  }
}

/**
 * Clear clinical data from storage
 */
export function clearClinicalData(): void {
  localStorage.removeItem(CLINICAL_DATA_KEY);
}

/**
 * Save patient list (clinical data only - identities in RAM)
 * Security: Only clinical portions are encrypted and stored
 */
export async function savePatientList(patients: PatientRecord[]): Promise<void> {
  try {
    // Store clinical data and reminders with IDs - identities stay in RAM
    const dataToStore = patients.map(p => ({
      id: p.id,
      clinical: p.clinical,
      reminders: p.reminders,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    const encrypted = await encryptData(JSON.stringify(dataToStore));
    localStorage.setItem(PATIENT_LIST_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save patient list:', error);
  }
}

/**
 * Load patient list clinical data with Zod validation
 */
export async function loadPatientListClinical(): Promise<Array<{
  id: string;
  clinical: ClinicalData;
  reminders?: PatientReminder[];
  createdAt: string;
  updatedAt: string;
}>> {
  try {
    const encrypted = localStorage.getItem(PATIENT_LIST_KEY);
    if (!encrypted) return [];
    
    const decrypted = await decryptData(encrypted);
    const rawData = JSON.parse(decrypted);
    
    // Validate with Zod schema array
    const arraySchema = z.array(PatientListClinicalSchema);
    const result = arraySchema.safeParse(rawData);
    if (!result.success) {
      console.error('Invalid patient list format:', result.error);
      return [];
    }
    
    return result.data as Array<{
      id: string;
      clinical: ClinicalData;
      reminders?: PatientReminder[];
      createdAt: string;
      updatedAt: string;
    }>;
  } catch (error) {
    console.error('Failed to load patient list:', error);
    return [];
  }
}

/**
 * Append entry to audit log (now encrypted)
 */
export async function appendAuditLog(entry: HandoverLogEntry): Promise<void> {
  try {
    const existing = await getAuditLog();
    existing.push(entry);
    const encrypted = await encryptData(JSON.stringify(existing));
    localStorage.setItem(AUDIT_LOG_KEY, encrypted);
  } catch (error) {
    console.error('Failed to append audit log:', error);
  }
}

/**
 * Get audit log entries with Zod validation (now decrypted)
 */
export async function getAuditLog(): Promise<HandoverLogEntry[]> {
  try {
    const data = localStorage.getItem(AUDIT_LOG_KEY);
    if (!data) return [];
    
    // Try to decrypt (new encrypted format)
    try {
      const decrypted = await decryptData(data);
      const rawData = JSON.parse(decrypted);
      
      // Validate with Zod schema array
      const arraySchema = z.array(HandoverLogEntrySchema);
      const result = arraySchema.safeParse(rawData);
      if (!result.success) {
        console.error('Invalid audit log format:', result.error);
        return [];
      }
      
      return result.data as HandoverLogEntry[];
    } catch {
      // Fallback: Try parsing as unencrypted (migration from old format)
      try {
        const rawData = JSON.parse(data);
        const arraySchema = z.array(HandoverLogEntrySchema);
        const result = arraySchema.safeParse(rawData);
        if (result.success) {
          // Migrate to encrypted format
          const encrypted = await encryptData(JSON.stringify(result.data));
          localStorage.setItem(AUDIT_LOG_KEY, encrypted);
          return result.data as HandoverLogEntry[];
        }
      } catch {
        // Both failed, return empty
      }
      return [];
    }
  } catch {
    return [];
  }
}

/**
 * Clear all stored data
 */
export function clearAllStorage(): void {
  localStorage.removeItem(CLINICAL_DATA_KEY);
  localStorage.removeItem(PATIENT_LIST_KEY);
  localStorage.removeItem(IDENTITIES_KEY);
  localStorage.removeItem(AUDIT_LOG_KEY);
  localStorage.removeItem(ARCHIVE_KEY);
  sessionStorage.removeItem('acutehandoff-key');
}

/**
 * Save patient identities to encrypted localStorage with Zod validation
 */
export async function savePatientIdentities(identities: Map<string, PatientIdentity>): Promise<void> {
  try {
    const obj = Object.fromEntries(identities);
    const encrypted = await encryptData(JSON.stringify(obj));
    localStorage.setItem(IDENTITIES_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save patient identities:', error);
  }
}

/**
 * Load patient identities from encrypted localStorage with Zod validation
 */
export async function loadPatientIdentities(): Promise<Map<string, PatientIdentity>> {
  try {
    const encrypted = localStorage.getItem(IDENTITIES_KEY);
    if (!encrypted) return new Map();
    
    const decrypted = await decryptData(encrypted);
    const rawData = JSON.parse(decrypted);
    
    // Validate each identity with Zod schema
    const validatedEntries: [string, PatientIdentity][] = [];
    for (const [key, value] of Object.entries(rawData)) {
      const result = PatientIdentitySchema.safeParse(value);
      if (result.success) {
        validatedEntries.push([key, result.data as PatientIdentity]);
      } else {
        console.error(`Invalid identity for key ${key}:`, result.error);
      }
    }
    
    return new Map(validatedEntries);
  } catch (error) {
    console.error('Failed to load patient identities:', error);
    return new Map();
  }
}

/**
 * Save archived patients to encrypted localStorage
 */
export async function saveArchivedPatients(patients: ArchivedPatient[]): Promise<void> {
  try {
    const encrypted = await encryptData(JSON.stringify(patients));
    localStorage.setItem(ARCHIVE_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save archived patients:', error);
  }
}

/**
 * Load archived patients from encrypted localStorage with Zod validation
 */
export async function loadArchivedPatients(): Promise<ArchivedPatient[]> {
  try {
    const encrypted = localStorage.getItem(ARCHIVE_KEY);
    if (!encrypted) return [];
    
    const decrypted = await decryptData(encrypted);
    const rawData = JSON.parse(decrypted);
    
    // Validate with Zod schema array
    const arraySchema = z.array(ArchivedPatientSchema);
    const result = arraySchema.safeParse(rawData);
    if (!result.success) {
      console.error('Invalid archived patients format:', result.error);
      return [];
    }
    
    return result.data as ArchivedPatient[];
  } catch (error) {
    console.error('Failed to load archived patients:', error);
    return [];
  }
}

/**
 * Delete an archived patient permanently
 */
export async function deleteArchivedPatient(patientId: string): Promise<void> {
  const archived = await loadArchivedPatients();
  const updated = archived.filter(p => p.id !== patientId);
  await saveArchivedPatients(updated);
}