import { OnboardingStep } from '@/components/onboarding/onboarding-step';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-sm">Datamodel.ai</span>
        <OnboardingStep />
      </div>
      <div className="max-w-2xl mx-auto px-4 py-12">
        {children}
      </div>
    </div>
  );
}
