// Clinical Zone Component - Manual SBAR Entry
// Security: Data encrypted before storage

import { FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ClinicalData } from '@/types/patient';

interface ClinicalZoneProps {
  clinical: ClinicalData;
  onUpdate: (updates: Partial<ClinicalData>) => void;
}

const SBAR_SECTIONS = [
  { key: 'situation', label: 'S - Situazione', placeholder: 'Motivo del ricovero, problema principale, parametri vitali attuali...' },
  { key: 'background', label: 'B - Background', placeholder: 'Anamnesi, comorbidità, terapia domiciliare, allergie...' },
  { key: 'assessment', label: 'A - Assessment', placeholder: 'Valutazione clinica, esami effettuati, risultati (PCR, WBC, Rx, TAC...)...' },
  { key: 'recommendation', label: 'R - Raccomandazione', placeholder: 'Piano terapeutico, esami da fare, consulenze, disposizione prevista...' },
] as const;

export function ClinicalZone({ clinical, onUpdate }: ClinicalZoneProps) {
  return (
    <div className="zone-clinical rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-primary">
        <FileText className="h-5 w-5" />
        <span className="font-semibold text-sm uppercase tracking-wide">
          Note SBAR
        </span>
        <span className="text-xs text-muted-foreground">
          Storage criptato
        </span>
      </div>

      {/* SBAR Sections */}
      <div className="grid gap-4">
        {SBAR_SECTIONS.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-foreground font-medium">
              {label}
            </Label>
            <Textarea
              id={key}
              value={clinical[key as keyof ClinicalData] as string}
              onChange={(e) => onUpdate({ [key]: e.target.value })}
              placeholder={placeholder}
              className="min-h-[100px] bg-background/50 border-primary/30 focus:border-primary resize-none scrollbar-thin"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
