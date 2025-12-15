// Security utilities for AcuteHandoff
// Uses Web Crypto API for encryption and hashing

const ENCRYPTION_KEY_NAME = 'acutehandoff-key';

/**
 * Generate or retrieve encryption key from sessionStorage
 * Key is ephemeral - lost when session ends
 */
async function getOrCreateKey(): Promise<CryptoKey> {
  const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_NAME);
  
  if (storedKey) {
    const keyData = JSON.parse(storedKey);
    return await crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exportedKey = await crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));
  
  return key;
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(data: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(encryptedData: string): Promise<string> {
  const key = await getOrCreateKey();
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  );
  
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  return new TextDecoder().decode(decrypted);
}

/**
 * Generate SHA-256 hash for audit logging
 * ONLY the hash is stored - never raw data
 */
export async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random session token for handover verification
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Sanitize text to remove PII before sending to AI
 * Removes: phone numbers, emails, common name patterns
 */
export function sanitizeForAI(text: string): string {
  let sanitized = text;
  
  // Remove phone numbers (various formats)
  sanitized = sanitized.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE]');
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Remove SSN patterns
  sanitized = sanitized.replace(/\d{3}[-.\s]?\d{2}[-.\s]?\d{4}/g, '[SSN]');
  
  // Remove common name prefixes with following words (Mr./Mrs./Dr. Name)
  sanitized = sanitized.replace(/\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+/g, '[NAME]');
  
  return sanitized;
}
