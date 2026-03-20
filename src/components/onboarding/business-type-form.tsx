'use client';

import { useState } from 'react';
import { saveBusinessType } from '@/lib/actions/onboarding';
import { B2B_VERTICALS, B2C_VERTICALS, STAGES } from '@/lib/onboarding/constants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function BusinessTypeForm() {
  const [businessType, setBusinessType] = useState<'b2b' | 'b2c' | null>(null);
  const [vertical, setVertical] = useState('');
  const [stage, setStage] = useState('');
  const [loading, setLoading] = useState(false);

  const verticals = businessType === 'b2b' ? B2B_VERTICALS : B2C_VERTICALS;
  const canSubmit = businessType && vertical && stage;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    await saveBusinessType({ businessType, vertical, stage });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <label className="text-sm font-medium">Business model</label>
        <div className="grid grid-cols-2 gap-3">
          {(['b2b', 'b2c'] as const).map((type) => (
            <Card
              key={type}
              onClick={() => { setBusinessType(type); setVertical(''); }}
              className={cn(
                'p-5 cursor-pointer transition-all duration-150',
                businessType === type
                  ? 'border-primary/60 bg-primary/5'
                  : 'hover:border-muted-foreground/40'
              )}
            >
              <p className="text-sm font-semibold uppercase">{type}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {type === 'b2b'
                  ? 'Company + User data model'
                  : 'User data model only'}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {businessType && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Vertical</label>
            <Select onValueChange={setVertical} value={vertical}>
              <SelectTrigger>
                <SelectValue placeholder="Select your vertical" />
              </SelectTrigger>
              <SelectContent>
                {verticals.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Company stage</label>
            <Select onValueChange={setStage} value={stage}>
              <SelectTrigger>
                <SelectValue placeholder="Select your stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full"
        size="lg"
      >
        {loading ? 'Saving...' : 'Continue →'}
      </Button>
    </div>
  );
}
