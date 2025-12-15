// Handover Modal Component
// QR Code based patient handover

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Send, Download, Copy, Check, Camera } from 'lucide-react';
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
import { HandoverPayload } from '@/types/patient';
import { toast } from '@/hooks/use-toast';

interface HandoverModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'send' | 'receive' | null;
  payload: HandoverPayload | null;
  sessionToken: string;
  onReceive: (payload: HandoverPayload, receiverId: string) => void;
  onSent: (receiverId: string) => void;
}

export function HandoverModal({
  open,
  onClose,
  mode,
  payload,
  sessionToken,
  onReceive,
  onSent,
}: HandoverModalProps) {
  const [receiverId, setReceiverId] = useState('');
  const [copied, setCopied] = useState(false);
  const [pastedData, setPastedData] = useState('');

  useEffect(() => {
    if (!open) {
      setReceiverId('');
      setCopied(false);
      setPastedData('');
    }
  }, [open]);

  const qrData = payload ? JSON.stringify(payload) : '';

  const handleCopyData = async () => {
    if (!qrData) return;
    await navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Data copied', description: 'Paste this on receiving device' });
  };

  const handleReceiveData = () => {
    if (!pastedData.trim()) {
      toast({ title: 'No data', description: 'Please paste the handover data', variant: 'destructive' });
      return;
    }
    if (!receiverId.trim()) {
      toast({ title: 'Receiver ID required', description: 'Enter your identifier', variant: 'destructive' });
      return;
    }

    try {
      const data = JSON.parse(pastedData) as HandoverPayload;
      onReceive(data, receiverId);
      onClose();
    } catch {
      toast({ title: 'Invalid data', description: 'Could not parse handover data', variant: 'destructive' });
    }
  };

  const handleConfirmSent = () => {
    if (!receiverId.trim()) {
      toast({ title: 'Receiver ID required', description: 'Enter receiver identifier for audit', variant: 'destructive' });
      return;
    }
    onSent(receiverId);
    onClose();
    toast({ title: 'Handover logged', description: `Sent to: ${receiverId}` });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'send' ? (
              <>
                <Send className="h-5 w-5 text-primary" />
                Send Handover
              </>
            ) : (
              <>
                <Download className="h-5 w-5 text-primary" />
                Receive Handover
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'send'
              ? 'Share the QR code or copy data for the receiving doctor'
              : 'Scan QR code or paste handover data'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'send' && payload && (
          <div className="space-y-4">
            {/* Session Token */}
            <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Token:</span>
              <span className="font-mono text-lg font-bold tracking-widest text-primary">
                {sessionToken}
              </span>
            </div>

            {/* QR Code */}
            <div className="flex justify-center p-4 bg-foreground rounded-lg">
              <QRCodeSVG
                value={qrData}
                size={200}
                level="M"
                bgColor="hsl(var(--foreground))"
                fgColor="hsl(var(--background))"
              />
            </div>

            {/* Copy Button */}
            <Button onClick={handleCopyData} variant="outline" className="w-full gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Data for Manual Transfer'}
            </Button>

            {/* Receiver ID for logging */}
            <div className="space-y-2">
              <Label htmlFor="receiver">Receiver ID (for audit log)</Label>
              <Input
                id="receiver"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="e.g., Dr. Smith"
              />
            </div>

            <Button onClick={handleConfirmSent} className="w-full">
              Confirm Handover Sent
            </Button>
          </div>
        )}

        {mode === 'receive' && (
          <div className="space-y-4">
            {/* Camera placeholder */}
            <div className="flex flex-col items-center justify-center h-48 bg-muted rounded-lg border-2 border-dashed border-border">
              <Camera className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center px-4">
                QR scanning requires camera access.<br />
                Use paste option below instead.
              </p>
            </div>

            {/* Manual paste option */}
            <div className="space-y-2">
              <Label htmlFor="paste">Paste Handover Data</Label>
              <Input
                id="paste"
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder="Paste copied data here"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="myId">Your ID (for audit log)</Label>
              <Input
                id="myId"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="e.g., Dr. Jones"
              />
            </div>

            <Button onClick={handleReceiveData} className="w-full">
              Import Patient Data
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
