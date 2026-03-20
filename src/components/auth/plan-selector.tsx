'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'starter',
    label: 'Starter',
    price: 'Free',
    description: 'Up to 2 sources, 50 fields',
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '$49/mo',
    description: 'Unlimited sources + AI reconciliation',
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 'Custom',
    description: 'SSO, audit logs, SLAs',
  },
] as const;

export const PLAN_STORAGE_KEY = 'dm_plan_intent';

export function PlanSelector({ defaultPlan }: { defaultPlan: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(defaultPlan);

  useEffect(() => {
    localStorage.setItem(PLAN_STORAGE_KEY, selected);
  }, [selected]);

  function handleSelect(planId: string) {
    setSelected(planId);
    router.replace(`/sign-up?plan=${planId}`, { scroll: false });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Select plan
      </p>
      <div className="grid grid-cols-3 gap-2">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => handleSelect(plan.id)}
            className={cn(
              'flex flex-col items-start p-3 rounded-lg border text-left transition-colors duration-150 cursor-pointer',
              selected === plan.id
                ? 'border-primary/60 bg-primary/5'
                : 'border-border hover:border-border/80 bg-card'
            )}
          >
            <span className="text-xs font-semibold">{plan.label}</span>
            <span className="text-xs text-primary font-medium">{plan.price}</span>
            <span className="text-xs text-muted-foreground mt-0.5 leading-tight">
              {plan.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
