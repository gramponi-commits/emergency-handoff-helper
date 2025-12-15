// Patient List Page
// Displays all patients in a clickable grid with flags and reminders

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, Trash2, ChevronRight, Bell, Clock, X, AlertTriangle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppHeader } from '@/components/AppHeader';
import { usePatientContext } from '@/context/PatientContext';
import { Input } from '@/components/ui/input';
import { ESITI_LABELS, Esito, ClinicalData } from '@/types/patient';
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
  } = usePatientContext();

  const [reminderDialog, setReminderDialog] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');

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

  const getPatientDisplayName = (patientId: string): string => {
    const identity = getIdentity(patientId);
    if (identity.name) return identity.name;
    if (identity.bedNumber) return `Letto ${identity.bedNumber}`;
    return 'Paziente senza nome';
  };

  const getStatusBadge = (clinical: ClinicalData) => {
    const hasSbar = clinical.situation || clinical.background || clinical.assessment || clinical.recommendation;
    if (hasSbar) {
      return <Badge className="bg-primary/20 text-primary border-primary/30">SBAR</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Nuovo</Badge>;
  };

  const getEsitoBadge = (esito: Esito | null) => {
    if (!esito) return null;
    const colors: Record<Esito, string> = {
      'D': 'bg-green-500/20 text-green-700 border-green-500/30',
      'OB': 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
      'OB/D': 'bg-lime-500/20 text-lime-700 border-lime-500/30',
      'OB/R': 'bg-orange-500/20 text-orange-700 border-orange-500/30',
      'R': 'bg-red-500/20 text-red-700 border-red-500/30',
    };
    return <Badge className={colors[esito]}>{esito}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader onWipeSession={wipeAllSession} />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Pazienti</h1>
            <p className="text-sm text-muted-foreground">
              {patients.length} pazient{patients.length === 1 ? 'e' : 'i'} in lista
            </p>
          </div>
          <Button onClick={handleAddPatient} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Paziente
          </Button>
        </div>

        {/* Patient Grid */}
        {patients.length === 0 ? (
          <Card className="border-dashed">
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
        ) : (
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {patients.map((patient) => {
                const identity = getIdentity(patient.id);
                const activeReminders = patient.reminders.filter(r => !r.triggered);
                
                return (
                  <Card
                    key={patient.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors group relative"
                    onClick={() => handleSelectPatient(patient.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-muted shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium truncate">
                              {getPatientDisplayName(patient.id)}
                            </h3>
                            {identity.bedNumber && identity.name && (
                              <p className="text-xs text-muted-foreground">
                                Letto {identity.bedNumber}
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
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReminderDialog(patient.id);
                                }}
                              >
                                <Bell className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent onClick={(e) => e.stopPropagation()}>
                              <DialogHeader>
                                <DialogTitle>Aggiungi Promemoria</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
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
                                
                                {/* Existing reminders */}
                                {patient.reminders.length > 0 && (
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">Promemoria attivi</label>
                                    <div className="space-y-2">
                                      {patient.reminders.map(reminder => (
                                        <div 
                                          key={reminder.id}
                                          className={`flex items-center justify-between p-2 rounded-md ${reminder.triggered ? 'bg-muted/50 line-through opacity-50' : 'bg-muted'}`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            <span className="text-sm font-mono">{reminder.time}</span>
                                            <span className="text-sm">{reminder.message}</span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
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
                                  Aggiungi
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
                                  Questa azione eliminerà tutti i dati di questo paziente.
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
                        {identity.allergico && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            ALL
                          </Badge>
                        )}
                        {identity.sociale && (
                          <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30 text-xs px-1.5 py-0">
                            <Heart className="h-3 w-3 mr-0.5" />
                            SOC
                          </Badge>
                        )}
                        {identity.comorbidities.map(c => (
                          <Badge key={c} variant="outline" className="text-xs px-1.5 py-0">
                            {c}
                          </Badge>
                        ))}
                        {getEsitoBadge(identity.esito)}
                      </div>

                      {/* Reminders indicator */}
                      {activeReminders.length > 0 && (
                        <div className="flex items-center gap-1 mb-2 text-xs text-amber-600">
                          <Bell className="h-3 w-3" />
                          {activeReminders.length} promemoria
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(patient.clinical)}
                          {identity.age && (
                            <span className="text-xs text-muted-foreground">
                              {identity.age} anni
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {patient.clinical.situation && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {patient.clinical.situation.substring(0, 80)}...
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
    </div>
  );
}
