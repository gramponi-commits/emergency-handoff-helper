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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <FileText className="h-5 w-5" />
          <span className="font-semibold text-sm uppercase tracking-wide">
            Clinical Context
          </span>
          <span className="text-xs text-muted-foreground">
            Encrypted storage
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
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate SBAR
            </>
          )}
        </Button>
      </div>

      {/* Dictation Input */}
      <div className="space-y-2">
        <Label htmlFor="dictation" className="text-muted-foreground">
          Clinical Notes / Dictation
        </Label>
        <Textarea
          id="dictation"
          value={clinical.rawDictation}
          onChange={(e) => onUpdate({ rawDictation: e.target.value })}
          placeholder="Enter clinical notes, history, examination findings, test results..."
          className="min-h-[200px] bg-background/50 border-primary/30 focus:border-primary resize-none scrollbar-thin"
        />
        <p className="text-xs text-muted-foreground">
          PII is automatically stripped before AI processing
        </p>
      </div>
    </div>
  );
}
