// Identity Zone Component
// Security: This data is stored in RAM ONLY - never persisted

import { AlertTriangle, User, Heart, AlertCircle, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  PatientIdentity, COMORBIDITIES, ESITI, ESITI_LABELS, Comorbidity, Esito,
  TRIAGE_LEVELS, TRIAGE_LABELS, TRIAGE_COLORS, TriageLevel
} from '@/types/patient';
import { cn } from '@/lib/utils';

interface IdentityZoneProps {
  identity: PatientIdentity;
  onUpdate: (updates: Partial<PatientIdentity>) => void;
}

export function IdentityZone({ identity, onUpdate }: IdentityZoneProps) {
  const toggleComorbidity = (comorbidity: Comorbidity) => {
    const current = identity.comorbidities || [];
    const updated = current.includes(comorbidity)
      ? current.filter(c => c !== comorbidity)
      : [...current, comorbidity];
    onUpdate({ comorbidities: updated });
  };

  const setEsito = (esito: Esito) => {
    onUpdate({ esito: identity.esito === esito ? null : esito });
  };

  const setTriage = (triage: TriageLevel) => {
    onUpdate({ triage });
  };

  return (
    <div className="zone-identity rounded-lg p-4 space-y-4">
      {/* Security Warning Header */}
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5 pulse-warning" />
        <span className="font-semibold text-sm uppercase tracking-wide">
          Identità (Solo RAM)
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          Cancellato alla chiusura
        </span>
      </div>

      {/* Triage Selection - Prominent */}
      <div className="space-y-2">
        <Label className="text-muted-foreground font-medium">
          Codice Triage
        </Label>
        <div className="flex flex-wrap gap-2">
          {TRIAGE_LEVELS.map((triage) => {
            const colors = TRIAGE_COLORS[triage];
            const isSelected = identity.triage === triage;
            return (
              <Badge
                key={triage}
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 select-none px-4 py-2 text-sm font-mono uppercase",
                  isSelected
                    ? cn(colors.bg, colors.text, colors.border, 'border-2 ring-2 ring-offset-2 ring-offset-background', colors.glow)
                    : "bg-muted/50 hover:bg-muted text-muted-foreground border border-border"
                )}
                onClick={() => setTriage(triage)}
                title={TRIAGE_LABELS[triage]}
              >
                {triage}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Identity Fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="name" className="text-muted-foreground flex items-center gap-2">
            <User className="h-3 w-3" />
            Nome Paziente
          </Label>
          <Input
            id="name"
            value={identity.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Inserisci nome paziente"
            className="bg-background/50 border-destructive/30 focus:border-destructive"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="age" className="text-muted-foreground">
            Età
          </Label>
          <Input
            id="age"
            type="number"
            value={identity.age || ''}
            onChange={(e) => onUpdate({ age: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="Età"
            className="bg-background/50 border-destructive/30 focus:border-destructive font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bed" className="text-muted-foreground">
            Letto #
          </Label>
          <Input
            id="bed"
            value={identity.bedNumber}
            onChange={(e) => onUpdate({ bedNumber: e.target.value })}
            placeholder="es. A-12"
            className="bg-background/50 border-destructive/30 focus:border-destructive font-mono text-lg font-bold"
          />
        </div>
      </div>

      {/* Comorbidities Flags */}
      <div className="space-y-2">
        <Label className="text-muted-foreground flex items-center gap-2">
          <Heart className="h-3 w-3" />
          Comorbidità
        </Label>
        <div className="flex flex-wrap gap-2">
          {COMORBIDITIES.map((comorbidity) => (
            <Badge
              key={comorbidity}
              variant="outline"
              className={cn(
                "cursor-pointer transition-all hover:scale-105 select-none",
                (identity.comorbidities || []).includes(comorbidity)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/50 hover:bg-muted"
              )}
              onClick={() => toggleComorbidity(comorbidity)}
            >
              {comorbidity}
            </Badge>
          ))}
        </div>
      </div>

      {/* Special Flags: Allergico & Sociale */}
      <div className="flex flex-wrap gap-3">
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer transition-all hover:scale-105 select-none px-3 py-1",
            identity.allergico
              ? "bg-triage-arancione text-primary-foreground border-triage-arancione"
              : "bg-background/50 hover:bg-triage-arancione/20 border-triage-arancione/50 text-triage-arancione"
          )}
          onClick={() => onUpdate({ allergico: !identity.allergico })}
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          ALLERGICO
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer transition-all hover:scale-105 select-none px-3 py-1",
            identity.sociale
              ? "bg-purple-500 text-primary-foreground border-purple-500"
              : "bg-background/50 hover:bg-purple-500/20 border-purple-500/50 text-purple-400"
          )}
          onClick={() => onUpdate({ sociale: !identity.sociale })}
        >
          <Users className="h-3 w-3 mr-1" />
          SOCIALE
        </Badge>
      </div>

      {/* Esito PS */}
      <div className="space-y-2">
        <Label className="text-muted-foreground">
          Esito Probabile
        </Label>
        <div className="flex flex-wrap gap-2">
          {ESITI.map((esito) => {
            const isSelected = identity.esito === esito;
            const colors = {
              'D': { active: 'bg-triage-verde text-primary-foreground border-triage-verde', inactive: 'hover:bg-triage-verde/20 text-triage-verde border-triage-verde/50' },
              'OB': { active: 'bg-triage-arancione text-primary-foreground border-triage-arancione', inactive: 'hover:bg-triage-arancione/20 text-triage-arancione border-triage-arancione/50' },
              'OB/D': { active: 'bg-triage-verde text-primary-foreground border-triage-verde', inactive: 'hover:bg-triage-verde/20 text-triage-verde border-triage-verde/50' },
              'OB/R': { active: 'bg-triage-rosso text-primary-foreground border-triage-rosso', inactive: 'hover:bg-triage-rosso/20 text-triage-rosso border-triage-rosso/50' },
              'R': { active: 'bg-triage-rosso text-primary-foreground border-triage-rosso', inactive: 'hover:bg-triage-rosso/20 text-triage-rosso border-triage-rosso/50' },
            };
            return (
              <Badge
                key={esito}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 select-none",
                  isSelected ? colors[esito].active : cn('bg-background/50', colors[esito].inactive)
                )}
                onClick={() => setEsito(esito)}
                title={ESITI_LABELS[esito]}
              >
                {esito}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
