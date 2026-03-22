'use client';

import { useState } from 'react';
import { updateNotificationPreference } from '@/lib/actions/notifications';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { NotificationType } from '@/lib/notifications/types';

type Preference = {
  type: NotificationType;
  label: string;
  description: string;
  enabled: boolean;
};

export function NotificationToggles({
  preferences,
}: {
  preferences: Preference[];
}) {
  const [states, setStates] = useState<Record<NotificationType, boolean>>(
    Object.fromEntries(preferences.map((p) => [p.type, p.enabled])) as Record<NotificationType, boolean>
  );
  const [saving, setSaving] = useState<NotificationType | null>(null);

  async function handleToggle(type: NotificationType, enabled: boolean) {
    setSaving(type);
    setStates((prev) => ({ ...prev, [type]: enabled }));
    try {
      await updateNotificationPreference(type, enabled);
    } catch {
      setStates((prev) => ({ ...prev, [type]: !enabled }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card className="divide-y divide-border rounded-xl">
      {preferences.map((pref) => (
        <div
          key={pref.type}
          className="flex items-start justify-between px-5 py-4"
        >
          <div className="space-y-0.5 pr-8">
            <p className="text-sm font-medium">{pref.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {pref.description}
            </p>
          </div>
          <Switch
            checked={states[pref.type]}
            onCheckedChange={(val) => handleToggle(pref.type, val)}
            disabled={saving === pref.type}
            className="mt-0.5 flex-shrink-0"
          />
        </div>
      ))}
    </Card>
  );
}
