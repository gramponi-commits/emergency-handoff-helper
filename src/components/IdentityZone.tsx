// Identity Zone Component
// Security: This data is stored in RAM ONLY - never persisted

import { AlertTriangle, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PatientIdentity } from '@/types/patient';

interface IdentityZoneProps {
  identity: PatientIdentity;
  onUpdate: (updates: Partial<PatientIdentity>) => void;
}

export function IdentityZone({ identity, onUpdate }: IdentityZoneProps) {
  return (
    <div className="zone-identity rounded-lg p-4 space-y-4">
      {/* Security Warning Header */}
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5 pulse-warning" />
        <span className="font-semibold text-sm uppercase tracking-wide">
          Identity (RAM Only)
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          Wiped on close
        </span>
      </div>

      {/* Identity Fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="name" className="text-muted-foreground flex items-center gap-2">
            <User className="h-3 w-3" />
            Patient Name
          </Label>
          <Input
            id="name"
            value={identity.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Enter patient name"
            className="bg-background/50 border-destructive/30 focus:border-destructive"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="age" className="text-muted-foreground">
            Age
          </Label>
          <Input
            id="age"
            type="number"
            value={identity.age || ''}
            onChange={(e) => onUpdate({ age: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="Age"
            className="bg-background/50 border-destructive/30 focus:border-destructive"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bed" className="text-muted-foreground">
            Bed #
          </Label>
          <Input
            id="bed"
            value={identity.bedNumber}
            onChange={(e) => onUpdate({ bedNumber: e.target.value })}
            placeholder="e.g., A-12"
            className="bg-background/50 border-destructive/30 focus:border-destructive"
          />
        </div>
      </div>
    </div>
  );
}
