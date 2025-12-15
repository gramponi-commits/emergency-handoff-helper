// Clinical Zone Component
// Security: Data encrypted before storage, anonymized before AI processing

import { FileText, Sparkles, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ClinicalData } from '@/types/patient';

interface ClinicalZoneProps {
  clinical: ClinicalData;
  onUpdate: (updates: Partial<ClinicalData>) => void;
  onGenerateSBAR: () => void;
  isGenerating: boolean;
}

export function ClinicalZone({ clinical, onUpdate, onGenerateSBAR, isGenerating }: ClinicalZoneProps) {
  return (
    <div className="zone-clinical rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-primary">
          <FileText className="h-5 w-5" />
          <span className="font-semibold text-sm uppercase tracking-wide">
            Contesto Clinico
          </span>
          <span className="text-xs text-muted-foreground">
            Storage criptato
          </span>
        </div>
        
        <Button 
          onClick={onGenerateSBAR}
          disabled={isGenerating || !clinical.rawDictation.trim()}
          size="sm"
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generazione...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Genera SBAR
            </>
          )}
        </Button>
      </div>

      {/* Dictation Input */}
      <div className="space-y-2">
        <Label htmlFor="dictation" className="text-muted-foreground">
          Note Cliniche / Dettatura
        </Label>
        <Textarea
          id="dictation"
          value={clinical.rawDictation}
          onChange={(e) => onUpdate({ rawDictation: e.target.value })}
          placeholder="Inserisci note cliniche, anamnesi, esame obiettivo, esami di laboratorio (PCR, WBC, etc.), esami strumentali...

Abbreviazioni supportate: SFD, R, OB/R, OBI/R, OB/D, OBI/D, D, PS, PA, FC, FR, SpO2, TC, GCS, ECG, Rx, TAC, RM, EGA, PCR, WBC, Hb, Plt, Cr, etc."
          className="min-h-[200px] bg-background/50 border-primary/30 focus:border-primary resize-none scrollbar-thin"
        />
        <p className="text-xs text-muted-foreground">
          I dati personali vengono automaticamente rimossi prima dell&apos;elaborazione AI
        </p>
      </div>
    </div>
  );
}
