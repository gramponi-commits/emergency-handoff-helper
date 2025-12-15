// Storage Service for AcuteHandoff
// Handles encrypted persistence of Vault B (Clinical Data) and Patient List

import { ClinicalData, HandoverLogEntry, PatientRecord, PatientReminder } from '@/types/patient';
import { encryptData, decryptData } from './crypto';

const CLINICAL_DATA_KEY = 'acutehandoff-clinical';
const AUDIT_LOG_KEY = 'acutehandoff-audit';
const PATIENT_LIST_KEY = 'acutehandoff-patients';

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
 * Load clinical data from encrypted localStorage
 */
export async function loadClinicalData(): Promise<ClinicalData | null> {
  try {
    const encrypted = localStorage.getItem(CLINICAL_DATA_KEY);
    if (!encrypted) return null;
    
    const decrypted = await decryptData(encrypted);
    return JSON.parse(decrypted);
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
 * Load patient list clinical data
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
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to load patient list:', error);
    return [];
  }
}

/**
 * Append entry to audit log
 */
export function appendAuditLog(entry: HandoverLogEntry): void {
  try {
    const existing = getAuditLog();
    existing.push(entry);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Failed to append audit log:', error);
  }
}

/**
 * Get audit log entries
 */
export function getAuditLog(): HandoverLogEntry[] {
  try {
    const data = localStorage.getItem(AUDIT_LOG_KEY);
    return data ? JSON.parse(data) : [];
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
  sessionStorage.removeItem('acutehandoff-key');
}
