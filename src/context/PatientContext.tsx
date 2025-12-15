// Patient Context Provider
// Shares patient state across all pages

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { 
  PatientIdentity, 
  ClinicalData, 
  PatientRecord,
  emptyPatientIdentity, 
  emptyClinicalData,
  createPatientRecord,
  HandoverPayload 
} from '@/types/patient';
import { savePatientList, loadPatientListClinical, appendAuditLog, clearAllStorage } from '@/lib/storage';
import { generateHash, generateSessionToken, sanitizeForAI } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PatientContextType {
  patients: PatientRecord[];
  currentPatientId: string | null;
  currentPatient: PatientRecord | null;
  addPatient: () => string;
  removePatient: (patientId: string) => void;
  selectPatient: (patientId: string | null) => void;
  getIdentity: (patientId: string) => PatientIdentity;
  identity: PatientIdentity;
  clinical: ClinicalData;
  updateIdentity: (updates: Partial<PatientIdentity>) => void;
  updateClinical: (updates: Partial<ClinicalData>) => void;
  generateSBAR: () => Promise<void>;
  wipeCurrentIdentity: () => void;
  wipeAllSession: () => void;
  sessionToken: string;
  isGenerating: boolean;
  prepareHandoverPayload: () => HandoverPayload | null;
  receiveHandover: (payload: HandoverPayload, receiverId: string) => Promise<void>;
  logHandover: (receiverId: string) => Promise<void>;
}

const PatientContext = createContext<PatientContextType | null>(null);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const identitiesRef = useRef<Map<string, PatientIdentity>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  const currentPatient = patients.find(p => p.id === currentPatientId) || null;

  useEffect(() => {
    const loadData = async () => {
      const savedClinical = await loadPatientListClinical();
      if (savedClinical.length > 0) {
        const loadedPatients: PatientRecord[] = savedClinical.map(c => ({
          id: c.id,
          identity: emptyPatientIdentity,
          clinical: c.clinical,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
        setPatients(loadedPatients);
        loadedPatients.forEach(p => {
          identitiesRef.current.set(p.id, emptyPatientIdentity);
        });
      }
      setSessionToken(generateSessionToken());
      setIsLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded && patients.length > 0) {
      savePatientList(patients);
    }
  }, [patients, isLoaded]);

  const addPatient = useCallback(() => {
    const newPatient = createPatientRecord();
    identitiesRef.current.set(newPatient.id, { ...emptyPatientIdentity });
    setPatients(prev => [...prev, newPatient]);
    setCurrentPatientId(newPatient.id);
    return newPatient.id;
  }, []);

  const removePatient = useCallback((patientId: string) => {
    identitiesRef.current.delete(patientId);
    setPatients(prev => prev.filter(p => p.id !== patientId));
    if (currentPatientId === patientId) {
      setCurrentPatientId(null);
    }
  }, [currentPatientId]);

  const selectPatient = useCallback((patientId: string | null) => {
    setCurrentPatientId(patientId);
  }, []);

  const updateIdentity = useCallback((updates: Partial<PatientIdentity>) => {
    if (!currentPatientId) return;
    
    const current = identitiesRef.current.get(currentPatientId) || emptyPatientIdentity;
    const updated = { ...current, ...updates };
    identitiesRef.current.set(currentPatientId, updated);
    
    setPatients(prev => prev.map(p => 
      p.id === currentPatientId 
        ? { ...p, identity: updated, updatedAt: new Date().toISOString() }
        : p
    ));
  }, [currentPatientId]);

  const updateClinical = useCallback(async (updates: Partial<ClinicalData>) => {
    if (!currentPatientId) return;
    
    setPatients(prev => prev.map(p => {
      if (p.id === currentPatientId) {
        return {
          ...p,
          clinical: { ...p.clinical, ...updates, timestamp: new Date().toISOString() },
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    }));
  }, [currentPatientId]);

  const generateSBAR = useCallback(async () => {
    if (!currentPatient || !currentPatient.clinical.rawDictation.trim()) {
      toast({
        title: 'Nessuna nota clinica',
        description: 'Inserisci le note cliniche prima di generare lo SBAR.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const sanitizedText = sanitizeForAI(currentPatient.clinical.rawDictation);
      
      const { data, error } = await supabase.functions.invoke('generate-sbar', {
        body: { clinicalNotes: sanitizedText },
      });

      if (error) throw error;

      await updateClinical({
        sbarResult: data.sbar,
        differentialDx: data.differentialDx || [],
      });

      toast({
        title: 'SBAR Generato',
        description: 'Note cliniche formattate con successo.',
      });
    } catch (error) {
      console.error('SBAR generation failed:', error);
      toast({
        title: 'Generazione fallita',
        description: 'Impossibile generare SBAR. Mostrando note originali.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [currentPatient, updateClinical]);

  const wipeCurrentIdentity = useCallback(() => {
    if (!currentPatientId) return;
    identitiesRef.current.set(currentPatientId, { ...emptyPatientIdentity });
    setPatients(prev => prev.map(p => 
      p.id === currentPatientId 
        ? { ...p, identity: { ...emptyPatientIdentity } }
        : p
    ));
    toast({
      title: 'Identità cancellata',
      description: 'Dati identificativi del paziente rimossi.',
    });
  }, [currentPatientId]);

  const wipeAllSession = useCallback(() => {
    identitiesRef.current.clear();
    setPatients([]);
    setCurrentPatientId(null);
    clearAllStorage();
    setSessionToken(generateSessionToken());
    toast({
      title: 'Sessione cancellata',
      description: 'Tutti i dati sono stati eliminati.',
    });
  }, []);

  const getIdentity = useCallback((patientId: string): PatientIdentity => {
    return identitiesRef.current.get(patientId) || emptyPatientIdentity;
  }, []);

  const prepareHandoverPayload = useCallback((): HandoverPayload | null => {
    if (!currentPatient) return null;
    const identity = identitiesRef.current.get(currentPatient.id) || emptyPatientIdentity;
    return {
      identity,
      clinical: currentPatient.clinical,
      sessionToken,
      timestamp: new Date().toISOString(),
    };
  }, [currentPatient, sessionToken]);

  const receiveHandover = useCallback(async (payload: HandoverPayload, receiverId: string) => {
    const newPatient = createPatientRecord(payload.identity, payload.clinical);
    identitiesRef.current.set(newPatient.id, payload.identity);
    setPatients(prev => [...prev, newPatient]);
    setCurrentPatientId(newPatient.id);

    const hashInput = `${payload.identity.name}|${payload.clinical.rawDictation}|${payload.timestamp}`;
    const hash = await generateHash(hashInput);
    
    appendAuditLog({
      hash,
      timestamp: new Date().toISOString(),
      receiverId,
      direction: 'received',
    });

    toast({
      title: 'Consegna ricevuta',
      description: `Paziente caricato. Token: ${payload.sessionToken}`,
    });
  }, []);

  const logHandover = useCallback(async (receiverId: string) => {
    if (!currentPatient) return;
    const identity = identitiesRef.current.get(currentPatient.id) || emptyPatientIdentity;
    const hashInput = `${identity.name}|${currentPatient.clinical.rawDictation}|${new Date().toISOString()}`;
    const hash = await generateHash(hashInput);
    
    appendAuditLog({
      hash,
      timestamp: new Date().toISOString(),
      receiverId,
      direction: 'sent',
    });
  }, [currentPatient]);

  const identity = currentPatient 
    ? (identitiesRef.current.get(currentPatient.id) || emptyPatientIdentity) 
    : emptyPatientIdentity;
  
  const clinical = currentPatient?.clinical || emptyClinicalData;

  return (
    <PatientContext.Provider value={{
      patients,
      currentPatientId,
      currentPatient,
      addPatient,
      removePatient,
      selectPatient,
      getIdentity,
      identity,
      clinical,
      updateIdentity,
      updateClinical,
      generateSBAR,
      wipeCurrentIdentity,
      wipeAllSession,
      sessionToken,
      isGenerating,
      prepareHandoverPayload,
      receiveHandover,
      logHandover,
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatientContext() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatientContext must be used within PatientProvider');
  }
  return context;
}
