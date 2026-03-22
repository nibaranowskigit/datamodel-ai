'use client';

import { useState } from 'react';
import { updateOrgProfile } from '@/lib/actions/settings';
import { B2B_VERTICALS, B2C_VERTICALS, STAGES } from '@/lib/onboarding/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type OrgProfile = {
  name: string;
  businessType: 'b2b' | 'b2c' | null;
  vertical: string | null;
  stage: string | null;
};

export function OrgProfileForm({ org }: { org: OrgProfile }) {
  const [name, setName]                   = useState(org.name ?? '');
  const [businessType, setBusinessType]   = useState<'b2b' | 'b2c'>(org.businessType ?? 'b2b');
  const [vertical, setVertical]           = useState(org.vertical ?? '');
  const [stage, setStage]                 = useState(org.stage ?? '');
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const [error, setError]                 = useState('');

  const verticals  = businessType === 'b2b' ? B2B_VERTICALS : B2C_VERTICALS;
  const typeChanged = businessType !== org.businessType && org.businessType !== null;
  const isDirty    =
    name !== org.name ||
    businessType !== org.businessType ||
    vertical !== (org.vertical ?? '') ||
    stage !== (org.stage ?? '');

  function handleBusinessTypeChange(val: 'b2b' | 'b2c') {
    setBusinessType(val);
    setVertical('');
  }

  async function handleSave() {
    if (!isDirty) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await updateOrgProfile({ name, businessType, vertical, stage });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 space-y-5">
      {/* Org name */}
      <div className="space-y-1.5">
        <Label htmlFor="org-name" className="text-xs">Organisation name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          className="h-9 max-w-sm"
        />
      </div>

      {/* Business type */}
      <div className="space-y-1.5">
        <Label className="text-xs">Business model</Label>
        <div className="flex gap-3">
          {(['b2b', 'b2c'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleBusinessTypeChange(type)}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-colors duration-150',
                businessType === type
                  ? 'border-primary/60 bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:border-border/80'
              )}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
        {typeChanged && (
          <p className="text-xs text-amber-400 mt-1">
            ⚠ Changing business type affects your data model structure.
            CDM records will {businessType === 'b2c' ? 'be hidden' : 'become available'}.
          </p>
        )}
      </div>

      {/* Vertical */}
      <div className="space-y-1.5">
        <Label className="text-xs">Vertical</Label>
        <Select value={vertical} onValueChange={setVertical}>
          <SelectTrigger className="h-9 max-w-xs">
            <SelectValue placeholder="Select vertical" />
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

      {/* Stage */}
      <div className="space-y-1.5">
        <Label className="text-xs">Company stage</Label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="h-9 max-w-xs">
            <SelectValue placeholder="Select stage" />
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

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={!isDirty || loading}
          size="sm"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
        {success && (
          <span className="text-xs text-green-400">Changes saved.</span>
        )}
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
    </Card>
  );
}
