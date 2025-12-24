// Patient Archive Page
// Displays archived/closed patients with option to permanently delete

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Archive, Trash2, User, Clock, Search, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { AppHeader } from '@/components/AppHeader';
import { usePatientContext } from '@/context/PatientContext';
import { 
  TRIAGE_LABELS, TRIAGE_COLORS, TriageLevel, ESITI_LABELS, Esito
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function PatientArchive() {
  const navigate = useNavigate();
  const { 
    archivedPatients,
    permanentlyDeletePatient,
    wipeAllSession,
  } = usePatientContext();

  const [searchQuery, setSearchQuery] = useState('');

  // Filter patients by search query
  const filteredPatients = archivedPatients.filter(patient => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.identity.name.toLowerCase().includes(query) ||
      patient.identity.bedNumber.toLowerCase().includes(query)
    );
  });

  // Sort by archivedAt descending (most recent first)
  const sortedPatients = [...filteredPatients].sort((a, b) => 
    new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
  );

  const getTriageBadge = (triage: TriageLevel) => {
    const colors = TRIAGE_COLORS[triage];
    return (
      <Badge className={cn(colors.bg, colors.text, colors.border, 'border uppercase font-mono text-xs')}>
        {triage}
      </Badge>
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy, HH:mm", { locale: it });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader onWipeSession={wipeAllSession} />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alla lista
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Archive className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Archivio Pazienti</h1>
              <p className="text-sm text-muted-foreground">
                {archivedPatients.length} pazient{archivedPatients.length === 1 ? 'e' : 'i'} archiviat{archivedPatients.length === 1 ? 'o' : 'i'}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {archivedPatients.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o letto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        )}

        {/* Patient List */}
        {archivedPatients.length === 0 ? (
          <Card className="border-dashed border-muted">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Archivio vuoto</h3>
              <p className="text-sm text-muted-foreground text-center">
                I pazienti rimossi dalla lista attiva appariranno qui
              </p>
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
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-3">
              {sortedPatients.map((patient) => {
                const identity = patient.identity;
                const colors = TRIAGE_COLORS[identity.triage];
                
                return (
                  <Card
                    key={patient.id}
                    className={cn(
                      "border-l-4 opacity-80 hover:opacity-100 transition-opacity",
                      colors.border,
                      colors.bg
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Patient Info */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {identity.bedNumber && (
                            <div className={cn(
                              "flex items-center justify-center h-10 w-14 rounded-md font-mono text-lg font-bold shrink-0",
                              colors.bg,
                              colors.text
                            )}>
                              {identity.bedNumber}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">
                                {identity.name || 'Senza nome'}
                              </h3>
                              {getTriageBadge(identity.triage)}
                              {getEsitoBadge(identity.esito)}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {identity.age && (
                                <span>{identity.age} anni</span>
                              )}
                              {identity.area && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {identity.area}
                                </Badge>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Archiviato: {formatDate(patient.archivedAt)}
                              </span>
                            </div>
                            {patient.clinical.situation && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {patient.clinical.situation}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare definitivamente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione è irreversibile. Tutti i dati del paziente 
                                "{identity.name || identity.bedNumber || 'Senza nome'}" 
                                saranno eliminati permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => permanentlyDeletePatient(patient.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Elimina definitivamente
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
