// Reminder Section Component
// Allows adding, viewing, and managing patient reminders with countdown

import { useState, useEffect } from 'react';
import { Bell, Clock, Plus, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PatientReminder } from '@/types/patient';
import { cn } from '@/lib/utils';

interface ReminderSectionProps {
  patientId: string;
  reminders: PatientReminder[];
  onAddReminder: (patientId: string, time: string, message: string) => void;
  onRemoveReminder: (patientId: string, reminderId: string) => void;
}

export function ReminderSection({ 
  patientId, 
  reminders, 
  onAddReminder, 
  onRemoveReminder 
}: ReminderSectionProps) {
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = () => {
    if (time && message.trim()) {
      onAddReminder(patientId, time, message.trim());
      setTime('');
      setMessage('');
    }
  };

  const getTimeRemaining = (reminderTime: string): string => {
    const [hours, minutes] = reminderTime.split(':').map(Number);
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);
    
    const diff = reminderDate.getTime() - currentTime.getTime();
    
    if (diff < 0) {
      return 'Scaduto';
    }
    
    const diffMinutes = Math.floor(diff / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (diffHours > 0) {
      return `${diffHours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const isExpired = (reminderTime: string): boolean => {
    const [hours, minutes] = reminderTime.split(':').map(Number);
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);
    return reminderDate.getTime() < currentTime.getTime();
  };

  const activeReminders = reminders.filter(r => !r.triggered);
  const triggeredReminders = reminders.filter(r => r.triggered);

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500" />
          Promemoria
          {activeReminders.length > 0 && (
            <Badge variant="secondary" className="ml-auto bg-amber-500/20 text-amber-600">
              {activeReminders.length} attiv{activeReminders.length === 1 ? 'o' : 'i'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Reminder */}
        <div className="flex gap-2">
          <div className="relative flex-shrink-0">
            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-28 pl-8 bg-background"
            />
          </div>
          <Input
            placeholder="Nota promemoria..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-background"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAdd();
              }
            }}
          />
          <Button 
            onClick={handleAdd} 
            disabled={!time || !message.trim()}
            size="icon"
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Active Reminders */}
        {activeReminders.length > 0 && (
          <div className="space-y-2">
            {activeReminders.map(reminder => {
              const expired = isExpired(reminder.time);
              const remaining = getTimeRemaining(reminder.time);
              
              return (
                <div 
                  key={reminder.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg",
                    expired 
                      ? "bg-destructive/10 border border-destructive/20" 
                      : "bg-background border border-border"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-8 w-16 rounded font-mono text-sm font-medium",
                    expired ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-600"
                  )}>
                    {reminder.time}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{reminder.message}</p>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "shrink-0",
                      expired && "border-destructive/30 text-destructive"
                    )}
                  >
                    {expired ? (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {remaining}
                  </Badge>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveReminder(patientId, reminder.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Triggered Reminders (dimmed) */}
        {triggeredReminders.length > 0 && (
          <div className="space-y-2 opacity-50">
            <p className="text-xs text-muted-foreground">Completati</p>
            {triggeredReminders.map(reminder => (
              <div 
                key={reminder.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 line-through"
              >
                <span className="font-mono text-xs">{reminder.time}</span>
                <span className="text-sm truncate flex-1">{reminder.message}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => onRemoveReminder(patientId, reminder.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {reminders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nessun promemoria impostato
          </p>
        )}
      </CardContent>
    </Card>
  );
}
