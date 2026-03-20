import { pgEnum } from 'drizzle-orm/pg-core';

export const fieldStatusEnum = pgEnum('field_status', [
  'proposed',
  'approved',
  'in_development',
  'staging',
  'production',
  'deprecated',
]);

export const fieldTypologyEnum = pgEnum('field_typology', [
  'GEN',
  'FIN',
  'PROD',
  'SUP',
  'SALES',
  'COMP',
  'AI',
]);

export const fieldDataTypeEnum = pgEnum('field_data_type', [
  'string',
  'number',
  'boolean',
  'date',
  'json',
  'array',
]);

export const sourceDirectionEnum = pgEnum('source_direction', [
  'read',
  'write',
]);

export const conflictRuleEnum = pgEnum('conflict_rule', [
  'master_wins',
  'latest_wins',
  'sum',
  'manual',
]);
