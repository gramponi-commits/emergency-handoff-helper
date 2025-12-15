// Patient List Page
// Displays all patients in a clickable grid

import { useNavigate } from 'react-router-dom';
import { Plus, User, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppHeader } from '@/components/AppHeader';
import { usePatientContext } from '@/context/PatientContext';
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

export default function PatientList() {
  const navigate = useNavigate();
  const { 
    patients, 
    addPatient, 
    removePatient, 
    selectPatient, 
    getIdentity,
    wipeAllSession 
  } = usePatientContext();

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

  const getPatientDisplayName = (patientId: string): string => {
    const identity = getIdentity(patientId);
    if (identity.name) return identity.name;
    if (identity.bedNumber) return `Letto ${identity.bedNumber}`;
    return 'Paziente senza nome';
  };

  const getStatusBadge = (clinical: { sbarResult: unknown; rawDictation: string }) => {
    if (clinical.sbarResult) {
      return <Badge className="bg-primary/20 text-primary border-primary/30">SBAR</Badge>;
    }
    if (clinical.rawDictation) {
      return <Badge variant="secondary">Note</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Nuovo</Badge>;
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

                      <div className="flex items-center justify-between mt-3">
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

                      {patient.clinical.rawDictation && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {patient.clinical.rawDictation.substring(0, 80)}...
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
