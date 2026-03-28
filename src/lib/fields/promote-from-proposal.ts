import type { NewUdmField } from '@/lib/db/schema';

export function mapProposalDataTypeToUdm(
  dt: string,
): NewUdmField['dataType'] {
  switch (dt) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'date';
    case 'json':
      return 'json';
    case 'enum':
    case 'string':
    default:
      return 'string';
  }
}

export function inferTypologyFromProposal(
  fieldKey: string,
  modelType: string,
): NewUdmField['typology'] {
  if (modelType === 'cdm') return 'COMP';
  if (fieldKey.startsWith('HS_')) return 'SALES';
  if (fieldKey.startsWith('FIN_')) return 'FIN';
  if (fieldKey.startsWith('SUP_')) return 'SUP';
  if (fieldKey.startsWith('PROD_')) return 'PROD';
  return 'GEN';
}
