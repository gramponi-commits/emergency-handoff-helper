// Zod validation schemas for patient handover data
// Security: Validates incoming JSON data before processing

import { z } from 'zod';
import { TRIAGE_LEVELS, COMORBIDITIES, ESITI, PENDING_TYPES } from './patient';

/**
 * Patient Identity Schema
 * Validates Vault A data structure
 */
export const PatientIdentitySchema = z.object({
  name: z.string().max(200),
  age: z.number().int().min(0).max(150).nullable(),
  bedNumber: z.string().max(50),
  admissionDate: z.string().max(50),
  triage: z.enum(TRIAGE_LEVELS),
  comorbidities: z.array(z.enum(COMORBIDITIES)),
  allergico: z.boolean(),
  sociale: z.boolean(),
  esito: z.enum(ESITI).nullable(),
});

/**
 * Clinical Data Schema
 * Validates Vault B data structure
 */
export const ClinicalDataSchema = z.object({
  situation: z.string().max(10000),
  background: z.string().max(10000),
  assessment: z.string().max(10000),
  recommendation: z.string().max(10000),
  pendingExams: z.array(z.enum(PENDING_TYPES)),
  timestamp: z.string().max(100),
});

/**
 * Single Patient Handover Payload Schema
 */
export const HandoverPayloadSchema = z.object({
  identity: PatientIdentitySchema,
  clinical: ClinicalDataSchema,
  sessionToken: z.string().max(100),
  timestamp: z.string().max(100),
});

/**
 * Multi-Patient Handover Payload Schema
 */
export const MultiPartPayloadSchema = z.object({
  patients: z.array(z.object({
    identity: PatientIdentitySchema,
    clinical: ClinicalDataSchema,
  })).max(100),
  sessionToken: z.string().max(100),
  timestamp: z.string().max(100),
});

/**
 * QR Chunk Array Schema for manual paste validation
 */
export const QRChunkArraySchema = z.array(z.string().max(2000)).max(200);

export type ValidatedHandoverPayload = z.infer<typeof HandoverPayloadSchema>;
export type ValidatedMultiPartPayload = z.infer<typeof MultiPartPayloadSchema>;
