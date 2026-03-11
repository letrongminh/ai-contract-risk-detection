import { Type } from '@google/genai';

export const templateSchema = {
  type: Type.OBJECT,
  properties: {
    contract_type: { type: Type.STRING },
    template_version: { type: Type.STRING },
    page_count: { type: Type.INTEGER },
    clauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clause_id: { type: Type.STRING },
          title: { type: Type.STRING },
          text: { type: Type.STRING },
          is_fixed: { type: Type.BOOLEAN },
          risk_if_changed: { type: Type.STRING },
          page_refs: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER }
          }
        },
        required: ["clause_id", "title", "text", "is_fixed", "risk_if_changed", "page_refs"]
      }
    },
    fields: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          field_name: { type: Type.STRING },
          value: { type: Type.STRING },
          page_ref: { type: Type.INTEGER }
        },
        required: ["field_name", "value", "page_ref"]
      }
    }
  },
  required: ["contract_type", "template_version", "page_count", "clauses", "fields"]
};
