// QR Multipart Protocol with lz-string compression
// Handles chunked QR transfers for large patient payloads

import { compressToBase64, decompressFromBase64 } from 'lz-string';
import { HandoverPayload, PatientIdentity, ClinicalData } from '@/types/patient';

// Max chars per QR chunk (safe limit for reliable scanning)
const MAX_CHUNK_SIZE = 900;
const PROTOCOL_PREFIX = 'AH:'; // AcuteHandoff protocol marker

export interface MultiPartPayload {
  patients: Array<{
    identity: PatientIdentity;
    clinical: ClinicalData;
  }>;
  sessionToken: string;
  timestamp: string;
}

export interface QRChunk {
  index: number;
  total: number;
  data: string;
}

/**
 * Compress and chunk payload for QR transfer
 */
export function encodeMultiPartPayload(payload: MultiPartPayload): string[] {
  const json = JSON.stringify(payload);
  const compressed = compressToBase64(json);
  
  if (!compressed) {
    throw new Error('Compression failed');
  }
  
  // If small enough, return single chunk
  if (compressed.length + 10 <= MAX_CHUNK_SIZE) {
    return [`${PROTOCOL_PREFIX}1:1:${compressed}`];
  }
  
  // Split into chunks
  const chunks: string[] = [];
  const chunkDataSize = MAX_CHUNK_SIZE - 10; // Reserve space for header
  const totalChunks = Math.ceil(compressed.length / chunkDataSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkDataSize;
    const end = Math.min(start + chunkDataSize, compressed.length);
    const chunkData = compressed.slice(start, end);
    chunks.push(`${PROTOCOL_PREFIX}${i + 1}:${totalChunks}:${chunkData}`);
  }
  
  return chunks;
}

/**
 * Parse a single QR chunk
 */
export function parseQRChunk(raw: string): QRChunk | null {
  if (!raw.startsWith(PROTOCOL_PREFIX)) {
    return null;
  }
  
  const content = raw.slice(PROTOCOL_PREFIX.length);
  const firstColon = content.indexOf(':');
  const secondColon = content.indexOf(':', firstColon + 1);
  
  if (firstColon === -1 || secondColon === -1) {
    return null;
  }
  
  const index = parseInt(content.slice(0, firstColon), 10);
  const total = parseInt(content.slice(firstColon + 1, secondColon), 10);
  const data = content.slice(secondColon + 1);
  
  if (isNaN(index) || isNaN(total) || index < 1 || index > total) {
    return null;
  }
  
  return { index, total, data };
}

/**
 * Reassemble chunks into payload
 */
export function decodeMultiPartPayload(chunks: QRChunk[]): MultiPartPayload | null {
  if (chunks.length === 0) return null;
  
  const total = chunks[0].total;
  
  // Check we have all chunks
  const sorted = [...chunks].sort((a, b) => a.index - b.index);
  if (sorted.length !== total) return null;
  
  // Verify sequence
  for (let i = 0; i < total; i++) {
    if (sorted[i].index !== i + 1) return null;
  }
  
  // Reassemble
  const compressed = sorted.map(c => c.data).join('');
  
  try {
    const json = decompressFromBase64(compressed);
    if (!json) return null;
    return JSON.parse(json) as MultiPartPayload;
  } catch {
    return null;
  }
}

/**
 * Convert single patient handover to multipart format
 */
export function singleToMultiPart(payload: HandoverPayload): MultiPartPayload {
  return {
    patients: [{
      identity: payload.identity,
      clinical: payload.clinical,
    }],
    sessionToken: payload.sessionToken,
    timestamp: payload.timestamp,
  };
}

/**
 * Estimate QR count for given patients
 */
export function estimateChunkCount(patientCount: number): number {
  // Rough estimate: ~500 chars per patient compressed
  const estimatedSize = patientCount * 500;
  return Math.max(1, Math.ceil(estimatedSize / (MAX_CHUNK_SIZE - 10)));
}
