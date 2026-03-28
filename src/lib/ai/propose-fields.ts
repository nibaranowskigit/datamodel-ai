import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { db } from '@/lib/db';
import { orgs, proposedFields } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  sampleUDMFields,
  sampleCDMFields,
  getKnownFieldKeys,
} from './field-sampler';
import { buildFieldProposalPrompt, buildCdmFieldProposalPrompt } from './prompts/propose-fields';
import { FieldProposalSchema } from './schemas/field-proposal';

const NAMESPACES = ['HS_', 'FIN_', 'SUP_', 'PROD_'] as const;
const MAX_PROPOSALS_PER_RUN = 20;
const MAX_PER_NAMESPACE = 5;
const MIN_CONFIDENCE = 0.6;
const MIN_RECORD_EVIDENCE = 5;
const MODEL_ID = 'claude-sonnet-4-20250514' as const;

function isUdmNamespaceKey(fieldKey: string, namespace: string): boolean {
  return fieldKey.startsWith(namespace);
}

function isPlainCdmKey(fieldKey: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(fieldKey);
}

export async function proposeFields(orgId: string, syncRunId: string): Promise<string[]> {
  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: {
      businessType: true,
      vertical:     true,
    },
  });

  if (!org) return [];

  const businessType = (org.businessType ?? 'b2b') as 'b2b' | 'b2c';
  const isB2b = businessType === 'b2b';

  const [samples, cdmSamples, knownFields] = await Promise.all([
    sampleUDMFields(orgId),
    isB2b ? sampleCDMFields(orgId) : Promise.resolve([]),
    getKnownFieldKeys(orgId),
  ]);

  if (samples.length === 0) return [];

  const connectedSources = [...new Set(samples.map((s) => s.sourceType))];
  const allProposals: string[] = [];

  const model = anthropic(MODEL_ID);

  for (const namespace of NAMESPACES) {
    if (allProposals.length >= MAX_PROPOSALS_PER_RUN) break;

    const namespaceSamples = samples.filter((s) => s.fieldKey.startsWith(namespace));
    if (namespaceSamples.length === 0) continue;

    const prompt = buildFieldProposalPrompt({
      businessType,
      vertical:         org.vertical ?? 'general',
      namespace,
      connectedSources,
      existingFields:   Array.from(knownFields),
      samples,
    });

    try {
      const { object } = await generateObject({
        model,
        schema: FieldProposalSchema,
        prompt,
      });

      for (const proposal of object.proposals.slice(0, MAX_PER_NAMESPACE)) {
        if (allProposals.length >= MAX_PROPOSALS_PER_RUN) break;
        if (!isUdmNamespaceKey(proposal.fieldKey, namespace)) continue;
        if (knownFields.has(proposal.fieldKey)) continue;
        if (proposal.confidence < MIN_CONFIDENCE) continue;
        if (proposal.sourceEvidence.recordCount < MIN_RECORD_EVIDENCE) continue;

        const inserted = await db
          .insert(proposedFields)
          .values({
            orgId,
            fieldKey:       proposal.fieldKey,
            label:          proposal.label,
            dataType:       proposal.dataType,
            enumValues:     proposal.enumValues ?? [],
            description:    proposal.description,
            sourceEvidence: JSON.stringify(proposal.sourceEvidence),
            confidence:     proposal.confidence,
            rationale:      proposal.rationale,
            syncRunId,
            modelType:      'udm',
            status:         'proposed',
          })
          .onConflictDoNothing({ target: [proposedFields.orgId, proposedFields.fieldKey] })
          .returning({ fieldKey: proposedFields.fieldKey });

        if (inserted.length > 0) {
          knownFields.add(proposal.fieldKey);
          allProposals.push(proposal.fieldKey);
        }
      }
    } catch (err) {
      console.error(`Field proposal failed for namespace ${namespace}:`, err);
    }
  }

  if (isB2b && allProposals.length < MAX_PROPOSALS_PER_RUN && cdmSamples.length > 0) {
    const existingCdmKeys = Array.from(knownFields).filter(
      (k) => !NAMESPACES.some((n) => k.startsWith(n)),
    );

    const cdmPrompt = buildCdmFieldProposalPrompt({
      vertical:         org.vertical ?? 'general',
      connectedSources,
      existingCdmKeys,
      samples:          cdmSamples,
    });

    try {
      const { object } = await generateObject({
        model,
        schema: FieldProposalSchema,
        prompt: cdmPrompt,
      });

      for (const proposal of object.proposals.slice(0, 3)) {
        if (allProposals.length >= MAX_PROPOSALS_PER_RUN) break;
        if (!isPlainCdmKey(proposal.fieldKey)) continue;
        if (knownFields.has(proposal.fieldKey)) continue;
        if (proposal.confidence < MIN_CONFIDENCE) continue;
        if (proposal.sourceEvidence.recordCount < MIN_RECORD_EVIDENCE) continue;

        const inserted = await db
          .insert(proposedFields)
          .values({
            orgId,
            fieldKey:       proposal.fieldKey,
            label:          proposal.label,
            dataType:       proposal.dataType,
            enumValues:     proposal.enumValues ?? [],
            description:    proposal.description,
            sourceEvidence: JSON.stringify(proposal.sourceEvidence),
            confidence:     proposal.confidence,
            rationale:      proposal.rationale,
            syncRunId,
            modelType:      'cdm',
            status:         'proposed',
          })
          .onConflictDoNothing({ target: [proposedFields.orgId, proposedFields.fieldKey] })
          .returning({ fieldKey: proposedFields.fieldKey });

        if (inserted.length > 0) {
          knownFields.add(proposal.fieldKey);
          allProposals.push(proposal.fieldKey);
        }
      }
    } catch (err) {
      console.error('CDM field proposal failed:', err);
    }
  }

  return allProposals;
}
