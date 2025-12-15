// Patient Detail Page
// Edit individual patient with manual SBAR entry

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Download, ArrowLeft, Users } from 'lucide-react';
import { usePatientContext } from '@/context/PatientContext';
import { AppHeader } from '@/components/AppHeader';
import { IdentityZone } from '@/components/IdentityZone';
import { ClinicalZone } from '@/components/ClinicalZone';
import { HandoverModal } from '@/components/HandoverModal';
import { Button } from '@/components/ui/button';

export default function PatientDetail() {
  const navigate = useNavigate();
  const {
    currentPatient,
    identity,
    clinical,
    sessionToken,
    updateIdentity,
    updateClinical,
    wipeCurrentIdentity,
    wipeAllSession,
    prepareHandoverPayload,
    receiveHandover,
    logHandover,
  } = usePatientContext();

  const [handoverMode, setHandoverMode] = useState<'send' | 'receive' | null>(null);

  // Redirect to list if no patient selected
  if (!currentPatient) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader onWipeSession={wipeAllSession} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Nessun paziente selezionato</p>
            <Button onClick={() => navigate('/')} className="gap-2">
              <Users className="h-4 w-4" />
              Vai alla lista pazienti
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader 
        onWipeSession={wipeAllSession} 
        onWipeIdentity={wipeCurrentIdentity}
      />

      {/* Back to list button */}
      <div className="container mx-auto px-4 pt-4 max-w-4xl">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alla lista
        </Button>
      </div>

      <main className="flex-1 container mx-auto px-4 py-4 space-y-6 max-w-4xl">
        {/* Identity Zone - RAM Only */}
        <IdentityZone identity={identity} onUpdate={updateIdentity} />

        {/* Clinical Zone - Manual SBAR */}
        <ClinicalZone
          clinical={clinical}
          onUpdate={updateClinical}
        />
      </main>

      {/* Floating Handover Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <Button
          onClick={() => setHandoverMode('receive')}
          variant="outline"
          size="lg"
          className="shadow-lg gap-2"
        >
          <Download className="h-5 w-5" />
          Ricevi
        </Button>
        <Button
          onClick={() => setHandoverMode('send')}
          size="lg"
          className="shadow-lg shadow-primary/25 gap-2"
        >
          <Send className="h-5 w-5" />
          Consegna
        </Button>
      </div>

      {/* Handover Modal */}
      <HandoverModal
        open={handoverMode !== null}
        onClose={() => setHandoverMode(null)}
        mode={handoverMode}
        payload={handoverMode === 'send' ? prepareHandoverPayload() : null}
        sessionToken={sessionToken}
        onReceive={receiveHandover}
        onSent={logHandover}
      />
    </div>
  );
}
