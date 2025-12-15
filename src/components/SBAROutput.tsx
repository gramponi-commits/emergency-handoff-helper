// SBAR Output Component
// Displays AI-formatted clinical notes

import { SBARResult } from '@/types/patient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Stethoscope, ArrowRight } from 'lucide-react';

interface SBAROutputProps {
  sbar: SBARResult | null;
  differentialDx: string[];
}

export function SBAROutput({ sbar, differentialDx }: SBAROutputProps) {
  if (!sbar) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>Generate SBAR to see formatted output</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* SBAR Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="sbar-situation">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-zone-situation" />
              <span className="text-zone-situation">Situation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-card-foreground">{sbar.situation}</p>
          </CardContent>
        </Card>

        <Card className="sbar-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-zone-background" />
              <span className="text-zone-background">Background</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-card-foreground">{sbar.background}</p>
          </CardContent>
        </Card>

        <Card className="sbar-assessment">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-zone-assessment" />
              <span className="text-zone-assessment">Assessment</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-card-foreground">{sbar.assessment}</p>
          </CardContent>
        </Card>

        <Card className="sbar-recommendation">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-zone-recommendation" />
              <span className="text-zone-recommendation">Recommendation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-card-foreground">{sbar.recommendation}</p>
          </CardContent>
        </Card>
      </div>

      {/* Differential Diagnosis */}
      {differentialDx.length > 0 && (
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Differential Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {differentialDx.map((dx, index) => (
                <Badge key={index} variant="secondary" className="font-mono text-xs">
                  {dx}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
