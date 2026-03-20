'use client';

import { usePathname } from 'next/navigation';

const STEP_MAP: Record<string, number> = {
  '/onboarding': 1,
  '/onboarding/connect': 2,
  '/onboarding/building': 3,
};

export function OnboardingStep() {
  const pathname = usePathname();
  const step = STEP_MAP[pathname] ?? 1;
  return (
    <span className="text-xs text-muted-foreground">Step {step} of 3</span>
  );
}
