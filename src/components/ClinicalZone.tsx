// Clinical Zone Component - Manual SBAR Entry with Pending Exams
// Security: Data encrypted before storage

import { FileText, FlaskConical, Scan, Stethoscope, Bed } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ClinicalData, PENDING_TYPES, PENDING_LABELS, PendingType } from '@/types/patient';
import { cn } from '@/lib/utils';

interface ClinicalZoneProps {
  clinical: ClinicalData;
  onUpdate: (updates: Partial<ClinicalData>) => void;
}

const SBAR_SECTIONS = [
  { key: 'situation', label: 'S - Situazione', placeholder: 'Motivo del ricovero, problema principale, parametri vitali attuali...', className: 'sbar-situation' },
  { key: 'background', label: 'B - Background', placeholder: 'Anamnesi, comorbidità, terapia domiciliare, allergie...', className: 'sbar-background' },
  { key: 'assessment', label: 'A - Assessment', placeholder: 'Valutazione clinica, esami effettuati, risultati (PCR, WBC, Rx, TAC...)...', className: 'sbar-assessment' },
  { key: 'recommendation', label: 'R - Raccomandazione', placeholder: 'Piano terapeutico, esami da fare, consulenze, disposizione prevista...', className: 'sbar-recommendation' },
] as const;

const PENDING_ICONS: Record<PendingType, typeof FlaskConical> = {
  lab: FlaskConical,
  imaging: Scan,
  consulenza: Stethoscope,
  postoLetto: Bed,
};

const PENDING_COLORS: Record<PendingType, { active: string; inactive: string }> = {
  lab: { active: 'bg-pending-lab text-primary-foreground border-pending-lab', inactive: 'hover:bg-pending-lab/20 text-pending-lab border-pending-lab/50' },
  imaging: { active: 'bg-pending-imaging text-primary-foreground border-pending-imaging', inactive: 'hover:bg-pending-imaging/20 text-pending-imaging border-pending-imaging/50' },
  consulenza: { active: 'bg-pending-consulenza text-primary-foreground border-pending-consulenza', inactive: 'hover:bg-pending-consulenza/20 text-pending-consulenza border-pending-consulenza/50' },
  postoLetto: { active: 'bg-pending-posto text-primary-foreground border-pending-posto', inactive: 'hover:bg-pending-posto/20 text-pending-posto border-pending-posto/50' },
};

export function ClinicalZone({ clinical, onUpdate }: ClinicalZoneProps) {
  const togglePending = (type: PendingType) => {
    const current = clinical.pendingExams || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onUpdate({ pendingExams: updated });
  };

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

      {/* Pending Exams Toggle */}
      <div className="space-y-2">
        <Label className="text-muted-foreground flex items-center gap-2">
          In Attesa
        </Label>
        <div className="flex flex-wrap gap-2">
          {PENDING_TYPES.map((type) => {
            const Icon = PENDING_ICONS[type];
            const isActive = (clinical.pendingExams || []).includes(type);
            const colors = PENDING_COLORS[type];
            return (
              <Badge
                key={type}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 select-none px-3 py-1 gap-1",
                  isActive ? cn(colors.active, 'pending-pulse') : cn('bg-background/50', colors.inactive)
                )}
                onClick={() => togglePending(type)}
              >
                <Icon className="h-3 w-3" />
                {PENDING_LABELS[type]}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* SBAR Sections */}
      <div className="grid gap-4">
        {SBAR_SECTIONS.map(({ key, label, placeholder, className }) => (
          <div key={key} className={cn("space-y-2 rounded-lg p-3", className)}>
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
