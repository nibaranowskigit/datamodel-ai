'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { connectSource } from '@/lib/actions/sources';
import { TIER_1_SOURCES } from '@/lib/onboarding/sources';
import type { DataSource } from '@/lib/db/schema';

type ConnectedSource = Omit<DataSource, 'connectionConfig'>;

interface Props {
  connected: ConnectedSource[];
}

export function ConnectSourcesForm({ connected }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [connectedTypes, setConnectedTypes] = useState<Set<string>>(
    new Set(connected.map((s) => s.sourceType))
  );

  function handleFieldChange(sourceType: string, key: string, value: string) {
    setFormValues((prev) => ({
      ...prev,
      [sourceType]: { ...(prev[sourceType] ?? {}), [key]: value },
    }));
  }

  function handleConnect(source: typeof TIER_1_SOURCES[number]) {
    const config = formValues[source.sourceType] ?? {};

    // Validate all fields are filled
    for (const field of source.fields) {
      if (!config[field.key]?.trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    startTransition(async () => {
      try {
        await connectSource({
          sourceType: source.sourceType as Parameters<typeof connectSource>[0]['sourceType'],
          displayName: source.label,
          config,
        });
        setConnectedTypes((prev) => new Set([...prev, source.sourceType]));
        setExpandedSource(null);
        // Clear form values for this source — do not hold plaintext longer than needed
        setFormValues((prev) => {
          const next = { ...prev };
          delete next[source.sourceType];
          return next;
        });
        toast.success(`${source.label} connected`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect source');
      }
    });
  }

  const hasConnected = connectedTypes.size > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {TIER_1_SOURCES.map((source) => {
          const isConnected = connectedTypes.has(source.sourceType);
          const isExpanded = expandedSource === source.sourceType;

          return (
            <Card
              key={source.sourceType}
              className={`transition-all ${isConnected ? 'border-green-500/50 bg-green-500/5' : ''}`}
            >
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => {
                  if (isConnected) return;
                  setExpandedSource(isExpanded ? null : source.sourceType);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{source.label}</CardTitle>
                    <CardDescription className="mt-0.5">{source.description}</CardDescription>
                  </div>
                  <div className="shrink-0">
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                        <span className="size-2 rounded-full bg-green-500" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {isExpanded ? '↑ Collapse' : '+ Connect'}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && !isConnected && (
                <CardContent className="pt-0">
                  <div className="space-y-3 border-t pt-4">
                    {source.fields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={`${source.sourceType}-${field.key}`}>
                          {field.label}
                        </Label>
                        <Input
                          id={`${source.sourceType}-${field.key}`}
                          type={field.type}
                          placeholder={field.type === 'password' ? '••••••••••••' : ''}
                          value={formValues[source.sourceType]?.[field.key] ?? ''}
                          onChange={(e) =>
                            handleFieldChange(source.sourceType, field.key, e.target.value)
                          }
                          autoComplete="off"
                        />
                      </div>
                    ))}
                    <Button
                      className="w-full mt-2"
                      onClick={() => handleConnect(source)}
                      disabled={isPending}
                    >
                      {isPending ? 'Connecting…' : `Connect ${source.label}`}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={() => router.push('/onboarding/building')}
          disabled={isPending}
        >
          Skip for now
        </Button>
        <Button
          onClick={() => router.push('/onboarding/building')}
          disabled={!hasConnected || isPending}
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}
