import { z } from 'zod';

/** UDM-style keys: HS_deal_owner, FIN_mrr */
const udmFieldKeyRegex = /^[A-Z]+_[a-z][a-z0-9_]*$/;
/** CDM aggregate keys: total_revenue, expansion_mrr_30d */
const cdmFieldKeyRegex = /^[a-z][a-z0-9_]*$/;

export const fieldProposalItemSchema = z
  .object({
    fieldKey: z
      .string()
      .refine(
        (k) => udmFieldKeyRegex.test(k) || cdmFieldKeyRegex.test(k),
        'Must be NAMESPACE_snake_case (UDM) or snake_case (CDM)',
      )
      .describe('e.g. HS_deal_owner, FIN_annual_contract_value, or total_active_users'),
    label: z
      .string()
      .min(2)
      .max(64)
      .describe('Human-readable label, e.g. "Deal owner"'),
    dataType: z
      .enum(['string', 'number', 'boolean', 'date', 'enum', 'json'])
      .describe('The data type of this field'),
    enumValues: z
      .array(z.string())
      .optional()
      .describe('Required if dataType is enum'),
    description: z
      .string()
      .min(10)
      .max(256)
      .describe('What this field means and where it comes from'),
    sourceEvidence: z
      .object({
        sourceType:   z.string(),
        sampleValues: z.array(z.string()).max(5),
        recordCount:  z.number(),
      })
      .describe('Evidence from actual UDM or CDM records'),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe('How confident the AI is this field is worth proposing'),
    rationale: z
      .string()
      .describe('Why this field is useful for agents or humans'),
  })
  .superRefine((val, ctx) => {
    if (val.dataType === 'enum' && (!val.enumValues || val.enumValues.length === 0)) {
      ctx.addIssue({
        code:    'custom',
        message: 'enumValues required when dataType is enum',
        path:    ['enumValues'],
      });
    }
  });

export const FieldProposalSchema = z.object({
  proposals: z.array(fieldProposalItemSchema).max(20),
});

export type FieldProposalResponse = z.infer<typeof FieldProposalSchema>;
export type FieldProposalItem = z.infer<typeof fieldProposalItemSchema>;
