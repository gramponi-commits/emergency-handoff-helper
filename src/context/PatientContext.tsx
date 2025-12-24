// Patient Context Provider
// Shares patient state across all pages - LOCAL ONLY, no AI

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { 
  PatientIdentity, 
  ClinicalData, 
  PatientRecord,
  PatientReminder,
  ArchivedPatient,
  emptyPatientIdentity, 
  emptyClinicalData,
  createPatientRecord,
  HandoverPayload 
} from '@/types/patient';
import { MultiPartPayload } from '@/lib/qr-multipart';
import { 
  savePatientList, 
  loadPatientListClinical, 
  appendAuditLog, 
  clearAllStorage,
  savePatientIdentities,
  loadPatientIdentities,
  saveArchivedPatients,
  loadArchivedPatients,
} from '@/lib/storage';
import { generateHash, generateSessionToken } from '@/lib/crypto';
import { toast } from '@/hooks/use-toast';

interface PatientContextType {
  patients: PatientRecord[];
  archivedPatients: ArchivedPatient[];
  currentPatientId: string | null;
  currentPatient: PatientRecord | null;
  addPatient: () => string;
  removePatient: (patientId: string) => void;
  permanentlyDeletePatient: (patientId: string) => Promise<void>;
  selectPatient: (patientId: string | null) => void;
  getIdentity: (patientId: string) => PatientIdentity;
  getArchivedIdentity: (patientId: string) => PatientIdentity;
  identity: PatientIdentity;
  clinical: ClinicalData;
  updateIdentity: (updates: Partial<PatientIdentity>) => void;
  updateClinical: (updates: Partial<ClinicalData>) => void;
  wipeCurrentIdentity: () => void;
  wipeAllSession: () => void;
  sessionToken: string;
  prepareHandoverPayload: () => HandoverPayload | null;
  receiveHandover: (payload: HandoverPayload, receiverId: string) => Promise<void>;
  receiveBulkHandover: (payload: MultiPartPayload, receiverId: string) => Promise<void>;
  logHandover: (receiverId: string) => Promise<void>;
  logBulkHandover: (receiverId: string, patientIds: string[]) => Promise<void>;
  addReminder: (patientId: string, time: string, message: string) => void;
  removeReminder: (patientId: string, reminderId: string) => void;
  triggerReminder: (patientId: string, reminderId: string) => void;
}

const PatientContext = createContext<PatientContextType | null>(null);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [archivedPatients, setArchivedPatients] = useState<ArchivedPatient[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const identitiesRef = useRef<Map<string, PatientIdentity>>(new Map());
  const archivedIdentitiesRef = useRef<Map<string, PatientIdentity>>(new Map());
  const [sessionToken, setSessionToken] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  const currentPatient = patients.find(p => p.id === currentPatientId) || null;

  useEffect(() => {
    const loadData = async () => {
      // Load identities from storage
      const savedIdentities = await loadPatientIdentities();
      identitiesRef.current = savedIdentities;
      
      // Load clinical data
      const savedClinical = await loadPatientListClinical();
      if (savedClinical.length > 0) {
        const loadedPatients: PatientRecord[] = savedClinical.map(c => ({
          id: c.id,
          identity: savedIdentities.get(c.id) || emptyPatientIdentity,
          clinical: c.clinical,
          reminders: c.reminders || [],
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
        setPatients(loadedPatients);
        // Ensure identities ref has all loaded patients
        loadedPatients.forEach(p => {
          if (!identitiesRef.current.has(p.id)) {
            identitiesRef.current.set(p.id, emptyPatientIdentity);
          }
        });
      }
      
      // Load archived patients
      const savedArchived = await loadArchivedPatients();
      setArchivedPatients(savedArchived);
      savedArchived.forEach(p => {
        archivedIdentitiesRef.current.set(p.id, p.identity);
      });
      
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

    const interval = setInterval(checkAlarms, 30000);
    checkAlarms();
    
    return () => clearInterval(interval);
  }, [patients]);

  // Save patients and identities when they change
  useEffect(() => {
    if (isLoaded && patients.length > 0) {
      savePatientList(patients);
      savePatientIdentities(identitiesRef.current);
    } else if (isLoaded && patients.length === 0) {
      // Clear storage if no patients
      savePatientList([]);
      savePatientIdentities(new Map());
    }
  }, [patients, isLoaded]);

  // Save archived patients when they change
  useEffect(() => {
    if (isLoaded) {
      saveArchivedPatients(archivedPatients);
    }
  }, [archivedPatients, isLoaded]);

  const addPatient = useCallback(() => {
    const newPatient = createPatientRecord();
    identitiesRef.current.set(newPatient.id, { ...emptyPatientIdentity });
    setPatients(prev => [...prev, newPatient]);
    setCurrentPatientId(newPatient.id);
    return newPatient.id;
  }, []);

  const removePatient = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    const identity = identitiesRef.current.get(patientId) || emptyPatientIdentity;
    
    if (patient) {
      // Move to archive instead of deleting
      const archivedPatient: ArchivedPatient = {
        id: patient.id,
        identity,
        clinical: patient.clinical,
        reminders: patient.reminders,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        archivedAt: new Date().toISOString(),
      };
      
      archivedIdentitiesRef.current.set(patientId, identity);
      setArchivedPatients(prev => [...prev, archivedPatient]);
    }
    
    identitiesRef.current.delete(patientId);
    setPatients(prev => prev.filter(p => p.id !== patientId));
    if (currentPatientId === patientId) {
      setCurrentPatientId(null);
    }
  }, [currentPatientId, patients]);

  const permanentlyDeletePatient = useCallback(async (patientId: string) => {
    archivedIdentitiesRef.current.delete(patientId);
    setArchivedPatients(prev => prev.filter(p => p.id !== patientId));
    toast({
      title: 'Paziente eliminato',
      description: 'Il paziente è stato eliminato definitivamente.',
    });
  }, []);

  const selectPatient = useCallback((patientId: string | null) => {
    setCurrentPatientId(patientId);
  }, []);

  const updateIdentity = useCallback((updates: Partial<PatientIdentity>) => {
    if (!currentPatientId) return;
    
    const current = identitiesRef.current.get(currentPatientId) || emptyPatientIdentity;
    const updated = { ...current, ...updates };
    identitiesRef.current.set(currentPatientId, updated);
    
    // Save identities immediately
    savePatientIdentities(identitiesRef.current);
    
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

  const wipeCurrentIdentity = useCallback(() => {
    if (!currentPatientId) return;
    identitiesRef.current.set(currentPatientId, { ...emptyPatientIdentity });
    savePatientIdentities(identitiesRef.current);
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
    archivedIdentitiesRef.current.clear();
    setPatients([]);
    setArchivedPatients([]);
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

  const getArchivedIdentity = useCallback((patientId: string): PatientIdentity => {
    return archivedIdentitiesRef.current.get(patientId) || emptyPatientIdentity;
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
    savePatientIdentities(identitiesRef.current);
    setPatients(prev => [...prev, newPatient]);
    setCurrentPatientId(newPatient.id);

    const hashInput = `${payload.identity.name}|${payload.clinical.situation}|${payload.timestamp}`;
    const hash = await generateHash(hashInput);
    
    await appendAuditLog({
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

  const receiveBulkHandover = useCallback(async (payload: MultiPartPayload, receiverId: string) => {
    const newPatients: PatientRecord[] = [];
    
    for (const p of payload.patients) {
      const newPatient = createPatientRecord(p.identity, p.clinical);
      identitiesRef.current.set(newPatient.id, p.identity);
      newPatients.push(newPatient);

      const hashInput = `${p.identity.name}|${p.clinical.situation}|${payload.timestamp}`;
      const hash = await generateHash(hashInput);
      
      await appendAuditLog({
        hash,
        timestamp: new Date().toISOString(),
        receiverId,
        direction: 'received',
      });
    }

    savePatientIdentities(identitiesRef.current);
    setPatients(prev => [...prev, ...newPatients]);
    
    toast({
      title: 'Consegna ricevuta',
      description: `${payload.patients.length} pazient${payload.patients.length === 1 ? 'e' : 'i'} caricato. Token: ${payload.sessionToken}`,
    });
  }, []);

  const logHandover = useCallback(async (receiverId: string) => {
    if (!currentPatient) return;
    const identity = identitiesRef.current.get(currentPatient.id) || emptyPatientIdentity;
    const hashInput = `${identity.name}|${currentPatient.clinical.situation}|${new Date().toISOString()}`;
    const hash = await generateHash(hashInput);
    
    await appendAuditLog({
      hash,
      timestamp: new Date().toISOString(),
      receiverId,
      direction: 'sent',
    });
  }, [currentPatient]);

  const logBulkHandover = useCallback(async (receiverId: string, patientIds: string[]) => {
    for (const patientId of patientIds) {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) continue;
      
      const identity = identitiesRef.current.get(patientId) || emptyPatientIdentity;
      const hashInput = `${identity.name}|${patient.clinical.situation}|${new Date().toISOString()}`;
      const hash = await generateHash(hashInput);
      
      await appendAuditLog({
        hash,
        timestamp: new Date().toISOString(),
        receiverId,
        direction: 'sent',
      });
    }
  }, [patients]);

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
      archivedPatients,
      currentPatientId,
      currentPatient,
      addPatient,
      removePatient,
      permanentlyDeletePatient,
      selectPatient,
      getIdentity,
      getArchivedIdentity,
      identity,
      clinical,
      updateIdentity,
      updateClinical,
      wipeCurrentIdentity,
      wipeAllSession,
      sessionToken,
      prepareHandoverPayload,
      receiveHandover,
      receiveBulkHandover,
      logHandover,
      logBulkHandover,
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
