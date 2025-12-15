// Patient Context Provider
// Shares patient state across all pages

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { 
  PatientIdentity, 
  ClinicalData, 
  PatientRecord,
  PatientReminder,
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
  addReminder: (patientId: string, time: string, message: string) => void;
  removeReminder: (patientId: string, reminderId: string) => void;
  triggerReminder: (patientId: string, reminderId: string) => void;
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
          reminders: c.reminders || [],
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

  // Alarm check interval
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      patients.forEach(patient => {
        patient.reminders.forEach(reminder => {
          if (!reminder.triggered && reminder.time === currentTime) {
            const identity = identitiesRef.current.get(patient.id);
            const patientName = identity?.name || identity?.bedNumber || 'Paziente';
            
            // Play sound
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAlEnuHdoWMUIkWa47BvHgQeTs/npl8SBhhYqvaYTQgADli29X1DAAALV8D4bC0AAAtez/hgIAAAD2PR+FUWAAATZdj4TRAAABdo2/hIDAAAG2rc+EQIAAAea9z4QgcAAB9s3PhBBgAAIGzc+EEFAAAhbNz4QQUAACFs3PhCBQAAIGzc+EIFAAAhbN34QgUAACBs3fhCBgAAIW3d+EMGAAAhbd74QwYAACFt3vhDBwAAIm7e+EMHAAAibt74RAcAACNu3/hEBwAAI2/f+EUIAAAkcN/4RQgAACVw4PhFCQAAJXHg+EYJAAAmceH4RgkAACdx4fhGCgAAJ3Li+EcKAAAocuL4RwoAAChy4vhHCwAAKXPj+EgLAAApc+P4SAwAACp05PhJDQAAK3Tk+EkNAAArdOX4Sg4AACx15fhKDgAALHXm+EsOAAAtdub4Sw8AAC125/hMDwAALnbn+EwQAAAvd+j4TRAAADBs5fhNEAAC');
            audio.play().catch(() => {});
            
            // Show toast
            toast({
              title: `⏰ Promemoria: ${patientName}`,
              description: reminder.message,
              duration: 10000,
            });
            
            // Mark as triggered inline
            setPatients(prev => prev.map(p => 
              p.id === patient.id 
                ? { ...p, reminders: p.reminders.map(r => r.id === reminder.id ? { ...r, triggered: true } : r) }
                : p
            ));
          }
        });
      });
    };

    const interval = setInterval(checkAlarms, 30000); // Check every 30 seconds
    checkAlarms(); // Initial check
    
    return () => clearInterval(interval);
  }, [patients]);

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

  const addReminder = useCallback((patientId: string, time: string, message: string) => {
    const newReminder: PatientReminder = {
      id: crypto.randomUUID(),
      time,
      message,
      triggered: false,
    };
    setPatients(prev => prev.map(p => 
      p.id === patientId 
        ? { ...p, reminders: [...p.reminders, newReminder], updatedAt: new Date().toISOString() }
        : p
    ));
  }, []);

  const removeReminder = useCallback((patientId: string, reminderId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId 
        ? { ...p, reminders: p.reminders.filter(r => r.id !== reminderId), updatedAt: new Date().toISOString() }
        : p
    ));
  }, []);

  const triggerReminder = useCallback((patientId: string, reminderId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId 
        ? { ...p, reminders: p.reminders.map(r => r.id === reminderId ? { ...r, triggered: true } : r) }
        : p
    ));
  }, []);

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
      addReminder,
      removeReminder,
      triggerReminder,
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
