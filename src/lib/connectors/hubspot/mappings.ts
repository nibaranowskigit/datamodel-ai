// HubSpot company property → CDM field_key
export const HUBSPOT_COMPANY_MAPPINGS: Record<string, string> = {
  'name':               'GEN_company_name_v1',
  'domain':             'GEN_domain_v1',
  'industry':           'GEN_industry_v1',
  'numberofemployees':  'GEN_headcount_v1',
  'city':               'GEN_city_v1',
  'country':            'GEN_country_v1',
  'annualrevenue':      'FIN_annual_revenue_v1',
  'hs_lead_status':     'SALES_lead_status_v1',
  'lifecyclestage':     'SALES_lifecycle_stage_v1',
  'hubspot_owner_id':   'SALES_owner_id_v1',
  'hs_lastcontacted':   'SALES_last_contacted_v1',
};

// HubSpot contact property → UDM field_key
export const HUBSPOT_CONTACT_MAPPINGS: Record<string, string> = {
  'firstname':              'GEN_first_name_v1',
  'lastname':               'GEN_last_name_v1',
  'email':                  'GEN_email_v1',
  'jobtitle':               'GEN_job_title_v1',
  'phone':                  'GEN_phone_v1',
  'lifecyclestage':         'SALES_lifecycle_stage_v1',
  'hs_lead_status':         'SALES_lead_status_v1',
  'hubspot_owner_id':       'SALES_owner_id_v1',
  'hs_lastcontacted':       'SALES_last_contacted_v1',
  'num_contacted_notes':    'SALES_contact_notes_count_v1',
  'associatedcompanyid':    'GEN_company_id_v1',
};

// Properties to request from HubSpot API
export const HUBSPOT_COMPANY_PROPERTIES = Object.keys(HUBSPOT_COMPANY_MAPPINGS);
export const HUBSPOT_CONTACT_PROPERTIES = Object.keys(HUBSPOT_CONTACT_MAPPINGS);
