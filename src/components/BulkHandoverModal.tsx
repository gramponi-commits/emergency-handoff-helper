// Bulk Handover Modal Component
// QR-based multi-patient transfer with compression

import { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Send, Download, Copy, Check, ChevronLeft, ChevronRight, 
  Users, User, Package, AlertTriangle 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QRScanner } from '@/components/QRScanner';
import { 
  encodeMultiPartPayload, 
  MultiPartPayload,
  estimateChunkCount 
} from '@/lib/qr-multipart';
import { PatientRecord, PatientIdentity, TRIAGE_COLORS } from '@/types/patient';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BulkHandoverModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'send' | 'receive' | null;
  patients: PatientRecord[];
  selectedIds: string[];
  getIdentity: (patientId: string) => PatientIdentity;
  sessionToken: string;
  onReceive: (payload: MultiPartPayload, receiverId: string) => void;
  onSent: (receiverId: string, patientIds: string[]) => void;
}

export function BulkHandoverModal({
  open,
  onClose,
  mode,
  patients,
  selectedIds,
  getIdentity,
  sessionToken,
  onReceive,
  onSent,
}: BulkHandoverModalProps) {
  const [receiverId, setReceiverId] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [pastedData, setPastedData] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setReceiverId('');
      setCopied(false);
      setCurrentChunk(0);
      setPastedData('');
    }
  }, [open]);

  // Generate QR chunks for selected patients
  const qrChunks = useMemo(() => {
    if (mode !== 'send' || selectedIds.length === 0) return [];
    
    const selectedPatients = patients.filter(p => selectedIds.includes(p.id));
    
    const payload: MultiPartPayload = {
      patients: selectedPatients.map(p => ({
        identity: getIdentity(p.id),
        clinical: p.clinical,
      })),
      sessionToken,
      timestamp: new Date().toISOString(),
    };

    try {
      return encodeMultiPartPayload(payload);
    } catch (err) {
      console.error('Encoding error:', err);
      return [];
    }
  }, [mode, selectedIds, patients, getIdentity, sessionToken]);

  const handleCopyData = async () => {
    if (qrChunks.length === 0) return;
    
    // Copy all chunks as JSON array for manual transfer
    await navigator.clipboard.writeText(JSON.stringify(qrChunks));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ 
      title: 'Dati copiati', 
      description: `${qrChunks.length} chunk${qrChunks.length > 1 ? 's' : ''} copiati negli appunti` 
    });
  };

  const handleReceiveComplete = (payload: MultiPartPayload) => {
    if (!receiverId.trim()) {
      toast({ 
        title: 'ID richiesto', 
        description: 'Inserisci il tuo identificativo prima di importare',
        variant: 'destructive' 
      });
      return;
    }
    onReceive(payload, receiverId);
    onClose();
  };

  const handleReceiveError = (message: string) => {
    toast({ title: 'Errore scansione', description: message, variant: 'destructive' });
  };

  const handleManualPaste = () => {
    if (!pastedData.trim()) {
      toast({ title: 'Nessun dato', description: 'Incolla i dati della consegna', variant: 'destructive' });
      return;
    }
    if (!receiverId.trim()) {
      toast({ title: 'ID richiesto', description: 'Inserisci il tuo identificativo', variant: 'destructive' });
      return;
    }

    try {
      // Try parsing as chunk array
      const chunks = JSON.parse(pastedData);
      if (Array.isArray(chunks)) {
        const { parseQRChunk, decodeMultiPartPayload } = require('@/lib/qr-multipart');
        const parsedChunks = chunks.map((c: string) => parseQRChunk(c)).filter(Boolean);
        const payload = decodeMultiPartPayload(parsedChunks);
        if (payload) {
          onReceive(payload, receiverId);
          onClose();
          return;
        }
      }
      
      // Try legacy single patient format
      const legacy = JSON.parse(pastedData);
      if (legacy.identity && legacy.clinical) {
        onReceive({
          patients: [{ identity: legacy.identity, clinical: legacy.clinical }],
          sessionToken: legacy.sessionToken || '',
          timestamp: legacy.timestamp || new Date().toISOString(),
        }, receiverId);
        onClose();
        return;
      }
      
      throw new Error('Invalid format');
    } catch {
      toast({ 
        title: 'Dati non validi', 
        description: 'Formato dati non riconosciuto',
        variant: 'destructive' 
      });
    }
  };

  const handleConfirmSent = () => {
    if (!receiverId.trim()) {
      toast({ 
        title: 'ID ricevente richiesto', 
        description: 'Inserisci identificativo ricevente per audit',
        variant: 'destructive' 
      });
      return;
    }
    onSent(receiverId, selectedIds);
    onClose();
    toast({ 
      title: 'Consegna registrata', 
      description: `${selectedIds.length} pazient${selectedIds.length === 1 ? 'e' : 'i'} consegnat${selectedIds.length === 1 ? 'o' : 'i'} a ${receiverId}` 
    });
  };

  const estimatedChunks = estimateChunkCount(selectedIds.length);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'send' ? (
              <>
                <Send className="h-5 w-5 text-primary" />
                Consegna Pazienti
                {selectedIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedIds.length}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Download className="h-5 w-5 text-primary" />
                Ricevi Consegna
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'send'
              ? `Trasferisci ${selectedIds.length} pazient${selectedIds.length === 1 ? 'e' : 'i'} tramite QR code`
              : 'Scansiona QR code o incolla i dati per ricevere pazienti'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {mode === 'send' && selectedIds.length > 0 && (
            <div className="space-y-4">
              {/* Patient list summary */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pazienti selezionati</Label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIds.slice(0, 10).map(id => {
                    const identity = getIdentity(id);
                    const colors = TRIAGE_COLORS[identity.triage];
                    return (
                      <Badge 
                        key={id} 
                        variant="outline"
                        className={cn("text-xs", colors.bg, colors.text, colors.border)}
                      >
                        {identity.bedNumber || '?'} - {identity.name || 'N/N'}
                      </Badge>
                    );
                  })}
                  {selectedIds.length > 10 && (
                    <Badge variant="secondary">+{selectedIds.length - 10}</Badge>
                  )}
                </div>
              </div>

              {/* QR info */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>
                  {qrChunks.length === 1 
                    ? 'Singolo QR code' 
                    : `${qrChunks.length} QR codes (multipart)`}
                </span>
              </div>

              {/* Session Token */}
              <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg">
                <span className="text-sm text-muted-foreground">Token:</span>
                <span className="font-mono text-lg font-bold tracking-widest text-primary">
                  {sessionToken}
                </span>
              </div>

              {/* QR Display with navigation */}
              {qrChunks.length > 0 && (
                <div className="space-y-3">
                  {qrChunks.length > 1 && (
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentChunk(c => Math.max(0, c - 1))}
                        disabled={currentChunk === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">
                        QR {currentChunk + 1} / {qrChunks.length}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentChunk(c => Math.min(qrChunks.length - 1, c + 1))}
                        disabled={currentChunk === qrChunks.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <QRCodeSVG
                      value={qrChunks[currentChunk]}
                      size={220}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>

                  {qrChunks.length > 1 && (
                    <Progress value={((currentChunk + 1) / qrChunks.length) * 100} className="h-1" />
                  )}
                </div>
              )}

              {/* Copy Button */}
              <Button onClick={handleCopyData} variant="outline" className="w-full gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiato!' : 'Copia Dati (trasferimento manuale)'}
              </Button>

              {/* Receiver ID */}
              <div className="space-y-2">
                <Label htmlFor="receiver">ID Ricevente (per audit)</Label>
                <Input
                  id="receiver"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  placeholder="es. Dr. Rossi"
                />
              </div>

              <Button onClick={handleConfirmSent} className="w-full" size="lg">
                Conferma Consegna
              </Button>
            </div>
          )}

          {mode === 'receive' && (
            <div className="space-y-4">
              {/* Receiver ID first */}
              <div className="space-y-2">
                <Label htmlFor="myId">Il Tuo ID (per audit)</Label>
                <Input
                  id="myId"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  placeholder="es. Dr. Bianchi"
                />
              </div>

              {/* QR Scanner */}
              <QRScanner 
                onComplete={handleReceiveComplete}
                onError={handleReceiveError}
              />

              {/* Manual paste fallback */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    oppure incolla manualmente
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paste">Dati Consegna</Label>
                <Input
                  id="paste"
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder="Incolla i dati copiati qui"
                />
              </div>

              <Button onClick={handleManualPaste} variant="secondary" className="w-full">
                Importa da Testo
              </Button>
            </div>
          )}

          {mode === 'send' && selectedIds.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Seleziona almeno un paziente dalla lista per la consegna
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
