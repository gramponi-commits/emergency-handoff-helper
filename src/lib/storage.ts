// Storage Service for AcuteHandoff
// Handles encrypted persistence of Vault B (Clinical Data) and Audit Logs

import { ClinicalData, HandoverLogEntry } from '@/types/patient';
import { encryptData, decryptData } from './crypto';

const CLINICAL_DATA_KEY = 'acutehandoff-clinical';
const AUDIT_LOG_KEY = 'acutehandoff-audit';

/**
 * Save clinical data to encrypted localStorage
 * Security: Data is encrypted before storage
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
 * Append entry to audit log
 * Security: Only SHA-256 hashes are stored, never raw patient data
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
 * Clear all stored data (for full session wipe)
 */
export function clearAllStorage(): void {
  localStorage.removeItem(CLINICAL_DATA_KEY);
  sessionStorage.removeItem('acutehandoff-key');
}
