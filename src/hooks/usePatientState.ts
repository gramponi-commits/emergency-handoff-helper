// Patient State Management Hook
// Manages Vault A (RAM) and Vault B (Encrypted Storage)

import { useState, useCallback, useEffect } from 'react';
import { 
  PatientIdentity, 
  ClinicalData, 
  emptyPatientIdentity, 
  emptyClinicalData,
  HandoverPayload 
} from '@/types/patient';
import { saveClinicalData, loadClinicalData, clearClinicalData, appendAuditLog, clearAllStorage } from '@/lib/storage';
import { generateHash, generateSessionToken, sanitizeForAI } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function usePatientState() {
  // Vault A: Identity - RAM ONLY, wiped on refresh
  const [identity, setIdentity] = useState<PatientIdentity>(emptyPatientIdentity);
  
  // Vault B: Clinical - Encrypted storage
  const [clinical, setClinical] = useState<ClinicalData>(emptyClinicalData);
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>('');

  // Load clinical data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      const saved = await loadClinicalData();
      if (saved) {
        setClinical(saved);
      }
    };
    loadData();
    setSessionToken(generateSessionToken());
  }, []);

  // Update identity (RAM only)
  const updateIdentity = useCallback((updates: Partial<PatientIdentity>) => {
    setIdentity(prev => ({ ...prev, ...updates }));
  }, []);

  // Update clinical data and persist
  const updateClinical = useCallback(async (updates: Partial<ClinicalData>) => {
    const updated = { ...clinical, ...updates, timestamp: new Date().toISOString() };
    setClinical(updated);
    await saveClinicalData(updated);
  }, [clinical]);

  // Generate SBAR using AI
  const generateSBAR = useCallback(async () => {
    if (!clinical.rawDictation.trim()) {
      toast({
        title: 'No clinical notes',
        description: 'Please enter clinical notes before generating SBAR.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Sanitize text before sending to AI
      const sanitizedText = sanitizeForAI(clinical.rawDictation);
      
      const { data, error } = await supabase.functions.invoke('generate-sbar', {
        body: { clinicalNotes: sanitizedText },
      });

      if (error) throw error;

      await updateClinical({
        sbarResult: data.sbar,
        differentialDx: data.differentialDx || [],
      });

      toast({
        title: 'SBAR Generated',
        description: 'Clinical notes formatted successfully.',
      });
    } catch (error) {
      console.error('SBAR generation failed:', error);
      toast({
        title: 'Generation Failed',
        description: 'Could not generate SBAR. Showing raw notes.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [clinical.rawDictation, updateClinical]);

  // Wipe entire session (identity cleared, clinical optional)
  const wipeSession = useCallback(async (wipeClinical = false) => {
    // Security: Identity is volatile - clear immediately
    setIdentity(emptyPatientIdentity);
    setSessionToken(generateSessionToken());
    
    if (wipeClinical) {
      setClinical(emptyClinicalData);
      clearAllStorage();
    }
    
    toast({
      title: 'Session Wiped',
      description: wipeClinical ? 'All data cleared.' : 'Patient identity cleared.',
    });
  }, []);

  // Prepare handover payload for QR transfer
  const prepareHandoverPayload = useCallback((): HandoverPayload => {
    return {
      identity,
      clinical,
      sessionToken,
      timestamp: new Date().toISOString(),
    };
  }, [identity, clinical, sessionToken]);

  // Receive handover from QR scan
  const receiveHandover = useCallback(async (payload: HandoverPayload, receiverId: string) => {
    // Load received data
    setIdentity(payload.identity);
    setClinical(payload.clinical);
    await saveClinicalData(payload.clinical);

    // Create audit log entry with hash only
    const hashInput = `${payload.identity.name}|${payload.clinical.rawDictation}|${payload.timestamp}`;
    const hash = await generateHash(hashInput);
    
    appendAuditLog({
      hash,
      timestamp: new Date().toISOString(),
      receiverId,
      direction: 'received',
    });

    toast({
      title: 'Handover Received',
      description: `Patient data loaded. Token: ${payload.sessionToken}`,
    });
  }, []);

  // Log outgoing handover
  const logHandover = useCallback(async (receiverId: string) => {
    const hashInput = `${identity.name}|${clinical.rawDictation}|${new Date().toISOString()}`;
    const hash = await generateHash(hashInput);
    
    appendAuditLog({
      hash,
      timestamp: new Date().toISOString(),
      receiverId,
      direction: 'sent',
    });
  }, [identity.name, clinical.rawDictation]);

  return {
    identity,
    clinical,
    sessionToken,
    isGenerating,
    updateIdentity,
    updateClinical,
    generateSBAR,
    wipeSession,
    prepareHandoverPayload,
    receiveHandover,
    logHandover,
  };
}
