// Patient List Page
// Displays all patients with triage colors, filters, pending exams, and bulk handover

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, User, Trash2, ChevronRight, Bell, Clock, X, AlertTriangle, Heart, 
  Search, FlaskConical, Scan, Stethoscope, Bed, Send, Download, CheckSquare, Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppHeader } from '@/components/AppHeader';
import { usePatientContext } from '@/context/PatientContext';
import { Input } from '@/components/ui/input';
import { BulkHandoverModal } from '@/components/BulkHandoverModal';
import { MultiPartPayload } from '@/lib/qr-multipart';
import { 
  ESITI_LABELS, Esito, ClinicalData, 
  TRIAGE_LEVELS, TRIAGE_LABELS, TRIAGE_COLORS, TriageLevel,
  PENDING_LABELS, PendingType
} from '@/types/patient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const PENDING_ICONS: Record<PendingType, typeof FlaskConical> = {
  lab: FlaskConical,
  imaging: Scan,
  consulenza: Stethoscope,
  postoLetto: Bed,
};

export default function PatientList() {
  const navigate = useNavigate();
  const { 
    patients, 
    addPatient, 
    removePatient, 
    selectPatient, 
    getIdentity,
    wipeAllSession,
    addReminder,
    removeReminder,
    sessionToken,
    receiveBulkHandover,
    logBulkHandover,
  } = usePatientContext();

  const [reminderDialog, setReminderDialog] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [handoverMode, setHandoverMode] = useState<'send' | 'receive' | null>(null);

  // Filter patients by search query (name or bed number)
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(patient => {
      const identity = getIdentity(patient.id);
      return (
        identity.name.toLowerCase().includes(query) ||
        identity.bedNumber.toLowerCase().includes(query)
      );
    });
  }, [patients, searchQuery, getIdentity]);

  // Sort patients by triage priority
  const sortedPatients = useMemo(() => {
    const triagePriority: Record<TriageLevel, number> = {
      rosso: 0,
      arancione: 1,
      azzurro: 2,
      verde: 3,
      bianco: 4,
    };
    return [...filteredPatients].sort((a, b) => {
      const aIdentity = getIdentity(a.id);
      const bIdentity = getIdentity(b.id);
      return triagePriority[aIdentity.triage] - triagePriority[bIdentity.triage];
    });
  }, [filteredPatients, getIdentity]);

  const handleAddPatient = () => {
    const newId = addPatient();
    selectPatient(newId);
    navigate('/patient');
  };

  const handleSelectPatient = (patientId: string) => {
    selectPatient(patientId);
    navigate('/patient');
  };

  const handleRemovePatient = (patientId: string) => {
    removePatient(patientId);
  };

  const handleAddReminder = (patientId: string) => {
    if (reminderTime && reminderMessage) {
      addReminder(patientId, reminderTime, reminderMessage);
      setReminderTime('');
      setReminderMessage('');
      setReminderDialog(null);
    }
  };

  const togglePatientSelection = (patientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatients(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPatients.size === sortedPatients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(sortedPatients.map(p => p.id)));
    }
  };

  const handleReceive = async (payload: MultiPartPayload, receiverId: string) => {
    await receiveBulkHandover(payload, receiverId);
  };

  const handleSent = async (receiverId: string, patientIds: string[]) => {
    await logBulkHandover(receiverId, patientIds);
    setSelectedPatients(new Set());
  };

  const getPatientDisplayName = (patientId: string): string => {
    const identity = getIdentity(patientId);
    if (identity.name) return identity.name;
    if (identity.bedNumber) return `Letto ${identity.bedNumber}`;
    return 'Paziente senza nome';
  };

  const getTriageClasses = (triage: TriageLevel, isCritical: boolean) => {
    const colors = TRIAGE_COLORS[triage];
    return cn(
      'border-l-4',
      colors.border,
      colors.bg,
      isCritical && triage === 'rosso' && 'critical-border triage-glow-rosso',
      triage === 'arancione' && 'triage-glow-arancione',
      triage === 'azzurro' && 'triage-glow-azzurro'
    );
  };

  const getEsitoBadge = (esito: Esito | null) => {
    if (!esito) return null;
    const colors: Record<Esito, string> = {
      'D': 'bg-triage-verde/20 text-triage-verde border-triage-verde/30',
      'OB': 'bg-triage-arancione/20 text-triage-arancione border-triage-arancione/30',
      'OB/D': 'bg-triage-verde/20 text-triage-verde border-triage-verde/30',
      'OB/R': 'bg-triage-rosso/20 text-triage-rosso border-triage-rosso/30',
      'R': 'bg-triage-rosso/20 text-triage-rosso border-triage-rosso/30',
    };
    return <Badge className={colors[esito]} title={ESITI_LABELS[esito]}>{esito}</Badge>;
  };

  const getTriageBadge = (triage: TriageLevel) => {
    const colors = TRIAGE_COLORS[triage];
    return (
      <Badge className={cn(colors.bg, colors.text, colors.border, 'border uppercase font-mono text-xs')}>
        {triage}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader onWipeSession={wipeAllSession} />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Pazienti</h1>
            <p className="text-sm text-muted-foreground">
              {patients.length} pazient{patients.length === 1 ? 'e' : 'i'} in lista
              {selectedPatients.size > 0 && (
                <span className="text-primary ml-2">
                  ({selectedPatients.size} selezionat{selectedPatients.size === 1 ? 'o' : 'i'})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setHandoverMode('receive')}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Ricevi
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setHandoverMode('send')}
              disabled={selectedPatients.size === 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Consegna {selectedPatients.size > 0 && `(${selectedPatients.size})`}
            </Button>
            <Button onClick={handleAddPatient} className="gap-2 shadow-lg shadow-primary/25">
              <Plus className="h-4 w-4" />
              Nuovo
            </Button>
          </div>
        </div>

        {/* Search Bar with Select All */}
        <div className="flex gap-2 mb-6">
          {patients.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSelectAll}
              className="shrink-0"
              title={selectedPatients.size === sortedPatients.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
            >
              {selectedPatients.size === sortedPatients.length && sortedPatients.length > 0 ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o letto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>

        {/* Patient Grid */}
        {patients.length === 0 ? (
          <Card className="border-dashed border-muted">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nessun paziente</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Aggiungi il primo paziente per iniziare
              </p>
              <Button onClick={handleAddPatient} className="gap-2">
                <Plus className="h-4 w-4" />
                Aggiungi Paziente
              </Button>
            </CardContent>
          </Card>
        ) : sortedPatients.length === 0 ? (
          <Card className="border-dashed border-muted">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nessun risultato</h3>
              <p className="text-sm text-muted-foreground">
                Nessun paziente corrisponde a "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPatients.map((patient) => {
                const identity = getIdentity(patient.id);
                const activeReminders = patient.reminders.filter(r => !r.triggered);
                const hasPending = patient.clinical.pendingExams?.length > 0;
                const isCritical = identity.triage === 'rosso' || identity.triage === 'arancione';
                const isSelected = selectedPatients.has(patient.id);
                
                return (
                  <Card
                    key={patient.id}
                    className={cn(
                      "cursor-pointer hover:bg-accent/50 transition-all group relative",
                      getTriageClasses(identity.triage, isCritical),
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    onClick={() => handleSelectPatient(patient.id)}
                  >
                    <CardContent className="p-4">
                      {/* Selection checkbox */}
                      <div 
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => togglePatientSelection(patient.id, e)}
                      >
                        <Checkbox
                          checked={isSelected}
                          className="h-5 w-5 border-2"
                        />
                      </div>
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-3 pl-6">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Bed Number - Large Monospace */}
                          {identity.bedNumber && (
                            <div className={cn(
                              "flex items-center justify-center h-10 w-14 rounded-md font-mono text-lg font-bold",
                              TRIAGE_COLORS[identity.triage].bg,
                              TRIAGE_COLORS[identity.triage].text
                            )}>
                              {identity.bedNumber}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium truncate">
                              {identity.name || 'Senza nome'}
                            </h3>
                            {identity.age && (
                              <p className="text-xs text-muted-foreground">
                                {identity.age} anni
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Reminder Button */}
                          <Dialog 
                            open={reminderDialog === patient.id} 
                            onOpenChange={(open) => {
                              if (!open) setReminderDialog(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8 shrink-0 transition-opacity",
                                  activeReminders.length > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReminderDialog(patient.id);
                                }}
                              >
                                <Bell className={cn(
                                  "h-4 w-4",
                                  activeReminders.length > 0 ? "text-amber-500" : "text-muted-foreground hover:text-primary"
                                )} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent onClick={(e) => e.stopPropagation()}>
                              <DialogHeader>
                                <DialogTitle>Promemoria - {getPatientDisplayName(patient.id)}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">Orario</label>
                                    <Input
                                      type="time"
                                      value={reminderTime}
                                      onChange={(e) => setReminderTime(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">Messaggio</label>
                                    <Input
                                      placeholder="Es: Controllare esami"
                                      value={reminderMessage}
                                      onChange={(e) => setReminderMessage(e.target.value)}
                                    />
                                  </div>
                                </div>
                                
                                {/* Existing reminders */}
                                {patient.reminders.length > 0 && (
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">Promemoria</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {patient.reminders.map(reminder => (
                                        <div 
                                          key={reminder.id}
                                          className={cn(
                                            "flex items-center justify-between p-2 rounded-md",
                                            reminder.triggered ? 'bg-muted/50 line-through opacity-50' : 'bg-muted'
                                          )}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            <span className="text-sm font-mono">{reminder.time}</span>
                                            <span className="text-sm truncate">{reminder.message}</span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 shrink-0"
                                            onClick={() => removeReminder(patient.id, reminder.id)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <Button 
                                  className="w-full" 
                                  onClick={() => handleAddReminder(patient.id)}
                                  disabled={!reminderTime || !reminderMessage}
                                >
                                  <Bell className="h-4 w-4 mr-2" />
                                  Aggiungi Promemoria
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Delete Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rimuovere paziente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione eliminerà tutti i dati di {getPatientDisplayName(patient.id)}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemovePatient(patient.id);
                                  }}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Rimuovi
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* Flags Row */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {getTriageBadge(identity.triage)}
                        {identity.allergico && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0 gap-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            ALL
                          </Badge>
                        )}
                        {identity.sociale && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs px-1.5 py-0 gap-0.5">
                            <Heart className="h-3 w-3" />
                            SOC
                          </Badge>
                        )}
                        {identity.comorbidities.slice(0, 3).map(c => (
                          <Badge key={c} variant="outline" className="text-xs px-1.5 py-0">
                            {c}
                          </Badge>
                        ))}
                        {identity.comorbidities.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            +{identity.comorbidities.length - 3}
                          </Badge>
                        )}
                        {getEsitoBadge(identity.esito)}
                      </div>

                      {/* Pending Exams */}
                      {hasPending && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {patient.clinical.pendingExams.map(exam => {
                            const Icon = PENDING_ICONS[exam];
                            return (
                              <Badge 
                                key={exam} 
                                variant="outline" 
                                className="text-xs px-1.5 py-0 gap-1 pending-pulse bg-amber-500/10 text-amber-500 border-amber-500/30"
                              >
                                <Icon className="h-3 w-3" />
                                {PENDING_LABELS[exam]}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          {activeReminders.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-500">
                              <Bell className="h-3 w-3" />
                              {activeReminders.length}
                            </span>
                          )}
                          {patient.clinical.situation && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                              SBAR
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Preview Text */}
                      {patient.clinical.situation && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          {patient.clinical.situation.substring(0, 60)}...
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </main>

      {/* Bulk Handover Modal */}
      <BulkHandoverModal
        open={handoverMode !== null}
        onClose={() => setHandoverMode(null)}
        mode={handoverMode}
        patients={patients}
        selectedIds={Array.from(selectedPatients)}
        getIdentity={getIdentity}
        sessionToken={sessionToken}
        onReceive={handleReceive}
        onSent={handleSent}
      />
    </div>
  );
}
