// Identity Zone Component
// Security: This data is stored in RAM ONLY - never persisted

import { AlertTriangle, User, Heart, AlertCircle, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PatientIdentity, COMORBIDITIES, ESITI, ESITI_LABELS, Comorbidity, Esito } from '@/types/patient';
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
            className="bg-background/50 border-destructive/30 focus:border-destructive"
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
            className="bg-background/50 border-destructive/30 focus:border-destructive"
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
              ? "bg-orange-500 text-white border-orange-500"
              : "bg-background/50 hover:bg-orange-500/20 border-orange-500/50"
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
              ? "bg-purple-500 text-white border-purple-500"
              : "bg-background/50 hover:bg-purple-500/20 border-purple-500/50"
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
          {ESITI.map((esito) => (
            <Badge
              key={esito}
              variant="outline"
              className={cn(
                "cursor-pointer transition-all hover:scale-105 select-none",
                identity.esito === esito
                  ? esito === 'D' ? "bg-green-500 text-white border-green-500"
                  : esito === 'R' ? "bg-red-500 text-white border-red-500"
                  : "bg-yellow-500 text-white border-yellow-500"
                  : "bg-background/50 hover:bg-muted"
              )}
              onClick={() => setEsito(esito)}
              title={ESITI_LABELS[esito]}
            >
              {esito}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
