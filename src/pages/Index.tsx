// AcuteHandoff - Main Application Page
// Privacy-focused ER patient handover app

import { useState } from 'react';
import { Send, Download, ArrowRightLeft } from 'lucide-react';
import { usePatientState } from '@/hooks/usePatientState';
import { AppHeader } from '@/components/AppHeader';
import { IdentityZone } from '@/components/IdentityZone';
import { ClinicalZone } from '@/components/ClinicalZone';
import { SBAROutput } from '@/components/SBAROutput';
import { HandoverModal } from '@/components/HandoverModal';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const {
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
  } = usePatientState();

  const [handoverMode, setHandoverMode] = useState<'send' | 'receive' | null>(null);

  const handleOpenSend = () => setHandoverMode('send');
  const handleOpenReceive = () => setHandoverMode('receive');
  const handleCloseHandover = () => setHandoverMode(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader onWipeSession={wipeSession} />

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Identity Zone - RAM Only */}
        <IdentityZone identity={identity} onUpdate={updateIdentity} />

        {/* Clinical Zone - Encrypted Storage */}
        <ClinicalZone
          clinical={clinical}
          onUpdate={updateClinical}
          onGenerateSBAR={generateSBAR}
          isGenerating={isGenerating}
        />

        {/* SBAR Output */}
        {clinical.sbarResult && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <span className="text-primary">SBAR Summary</span>
                <span className="text-xs text-muted-foreground font-normal">
                  AI-formatted output
                </span>
              </h2>
              <SBAROutput sbar={clinical.sbarResult} differentialDx={clinical.differentialDx} />
            </div>
          </>
        )}
      </main>

      {/* Floating Handover Button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <Button
          onClick={handleOpenReceive}
          variant="outline"
          size="lg"
          className="shadow-lg gap-2"
        >
          <Download className="h-5 w-5" />
          Receive
        </Button>
        <Button
          onClick={handleOpenSend}
          size="lg"
          className="shadow-lg shadow-primary/25 gap-2"
        >
          <Send className="h-5 w-5" />
          Handover
        </Button>
      </div>

      {/* Mobile bottom hint */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent pointer-events-none">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ArrowRightLeft className="h-4 w-4" />
          <span>Tap buttons to transfer patient</span>
        </div>
      </div>

      {/* Handover Modal */}
      <HandoverModal
        open={handoverMode !== null}
        onClose={handleCloseHandover}
        mode={handoverMode}
        payload={handoverMode === 'send' ? prepareHandoverPayload() : null}
        sessionToken={sessionToken}
        onReceive={receiveHandover}
        onSent={logHandover}
      />
    </div>
  );
};

export default Index;
