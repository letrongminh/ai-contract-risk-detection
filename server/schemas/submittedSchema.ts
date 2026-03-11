import { Type } from '@google/genai';

export const submittedSchema = {
  type: Type.OBJECT,
  properties: {
    contract_type: { type: Type.STRING },
    page_count: { type: Type.INTEGER },
    clauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clause_id: { type: Type.STRING },
          title: { type: Type.STRING },
          text: { type: Type.STRING },
          page_refs: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER }
          },
          readability: { type: Type.STRING }
        },
        required: ["clause_id", "title", "text", "page_refs", "readability"]
      }
    },
    fields: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          field_name: { type: Type.STRING },
          value: { type: Type.STRING },
          page_ref: { type: Type.INTEGER },
          confidence: { type: Type.NUMBER }
        },
        required: ["field_name", "value", "page_ref", "confidence"]
      }
    },
    document_quality: {
      type: Type.OBJECT,
      properties: {
        readability: { type: Type.STRING },
        missing_pages: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER }
        },
        issues: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["readability", "missing_pages", "issues"]
    }
  },
  required: ["contract_type", "page_count", "clauses", "fields", "document_quality"]
};
