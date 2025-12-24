// App Header Component
// Security-focused header with session controls

import { Shield, Trash2, AlertTriangle, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { usePatientContext } from '@/context/PatientContext';

interface AppHeaderProps {
  onWipeSession: () => void;
  onWipeIdentity?: () => void;
  showBackButton?: boolean;
}

export function AppHeader({ onWipeSession, onWipeIdentity, showBackButton }: AppHeaderProps) {
  const navigate = useNavigate();
  const { archivedPatients } = usePatientContext();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => navigate('/')}
          >
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">AcuteHandoff</h1>
            <p className="text-xs text-muted-foreground">Consegna PS Sicura</p>
          </div>
        </div>

        {/* Session Controls */}
        <div className="flex items-center gap-2">
          {/* Archive Link */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/archive')}
            className="text-muted-foreground hover:text-foreground relative"
          >
            <Archive className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Archivio</span>
            {archivedPatients.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-muted rounded-full flex items-center justify-center">
                {archivedPatients.length}
              </span>
            )}
          </Button>
          {onWipeIdentity && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Cancella Identità</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancellare identità paziente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questo cancellerà nome, età e numero letto dalla memoria.
                    Le note cliniche saranno mantenute.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={onWipeIdentity}>
                    Cancella Identità
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Cancella Tutto</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Cancellazione Emergenza
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Questo eliminerà permanentemente TUTTI i dati dei pazienti incluse identità e note cliniche.
                  Questa azione non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onWipeSession}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Cancella Tutto
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
