// QR Code Scanner Component using html5-qrcode
// Handles camera-based QR scanning with multipart support

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { parseQRChunk, QRChunk, decodeMultiPartPayload, MultiPartPayload } from '@/lib/qr-multipart';
import { cn } from '@/lib/utils';

interface QRScannerProps {
  onComplete: (payload: MultiPartPayload) => void;
  onError: (message: string) => void;
}

export function QRScanner({ onComplete, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [chunks, setChunks] = useState<Map<number, QRChunk>>(new Map());
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScan = useCallback((decodedText: string) => {
    // Avoid duplicate scans
    if (decodedText === lastScanned) return;
    setLastScanned(decodedText);
    setError(null);

    const chunk = parseQRChunk(decodedText);
    
    if (!chunk) {
      // Try legacy single-patient JSON format
      try {
        const legacy = JSON.parse(decodedText);
        if (legacy.identity && legacy.clinical) {
          onComplete({
            patients: [{ identity: legacy.identity, clinical: legacy.clinical }],
            sessionToken: legacy.sessionToken || '',
            timestamp: legacy.timestamp || new Date().toISOString(),
          });
          stopScanning();
          return;
        }
      } catch {
        setError('QR non valido');
        return;
      }
    }

    if (chunk) {
      setTotalChunks(chunk.total);
      setChunks(prev => {
        const next = new Map(prev);
        next.set(chunk.index, chunk);
        
        // Check if complete
        if (next.size === chunk.total) {
          const payload = decodeMultiPartPayload(Array.from(next.values()));
          if (payload) {
            onComplete(payload);
            stopScanning();
          } else {
            setError('Errore decodifica dati');
          }
        }
        
        return next;
      });
    }
  }, [lastScanned, onComplete, stopScanning]);

  const startScanning = async () => {
    if (!containerRef.current) return;
    
    setError(null);
    setChunks(new Map());
    setTotalChunks(null);
    setLastScanned(null);

    try {
      scannerRef.current = new Html5Qrcode('qr-reader');
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        handleScan,
        () => {} // Ignore scan errors
      );
      
      setIsScanning(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore fotocamera';
      setError(message);
      onError(message);
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  const progress = totalChunks ? (chunks.size / totalChunks) * 100 : 0;
  const scannedIndices = Array.from(chunks.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className={cn(
          "relative rounded-lg overflow-hidden bg-muted border-2 border-dashed",
          isScanning ? "border-primary" : "border-border"
        )}
      >
        <div id="qr-reader" className="w-full" style={{ minHeight: isScanning ? 300 : 200 }} />
        
        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <Camera className="h-12 w-12 text-muted-foreground mb-3" />
            <Button onClick={startScanning} className="gap-2">
              <Camera className="h-4 w-4" />
              Avvia Scanner
            </Button>
          </div>
        )}
      </div>

      {/* Progress indicator for multipart */}
      {totalChunks && totalChunks > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              QR scansionati: {chunks.size}/{totalChunks}
            </span>
            <span className="font-mono text-xs">
              {scannedIndices.join(', ')}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Status indicators */}
      {isScanning && !error && chunks.size === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Inquadra il QR code...
        </div>
      )}

      {chunks.size > 0 && totalChunks && chunks.size < totalChunks && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Continua a scansionare i QR rimanenti
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {isScanning && (
        <Button variant="outline" onClick={stopScanning} className="w-full">
          Ferma Scanner
        </Button>
      )}
    </div>
  );
}
