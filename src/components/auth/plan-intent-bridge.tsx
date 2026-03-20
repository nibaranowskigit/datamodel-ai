'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { PLAN_STORAGE_KEY } from './plan-selector';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter — Free',
  pro: 'Pro — $49/mo',
  enterprise: 'Enterprise — Custom',
};

export function PlanIntentBridge() {
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PLAN_STORAGE_KEY);
    if (stored) setPlan(stored);
  }, []);

  if (!plan) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Signing up for</span>
      <Badge variant="secondary" className="font-mono text-xs">
        {PLAN_LABELS[plan] ?? plan}
      </Badge>
    </div>
  );
}
