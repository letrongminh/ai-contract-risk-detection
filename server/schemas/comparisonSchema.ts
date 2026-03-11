import { Type } from '@google/genai';

export const comparisonSchema = {
  type: Type.OBJECT,
  properties: {
    overall_risk: {
      type: Type.STRING,
      description: "Must be PASS, REVIEW, or FAIL"
    },
    recommended_action: { type: Type.STRING },
    overall_confidence: { type: Type.NUMBER },
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
    },
    field_differences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          field_name: { type: Type.STRING },
          template_value: { type: Type.STRING },
          submitted_value: { type: Type.STRING },
          change_type: { type: Type.STRING },
          risk: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reason: { type: Type.STRING }
        },
        required: [
          "field_name",
          "template_value",
          "submitted_value",
          "change_type",
          "risk",
          "confidence",
          "reason"
        ]
      }
    },
    clause_differences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clause_id: { type: Type.STRING },
          title: { type: Type.STRING },
          change_type: { type: Type.STRING },
          risk: { type: Type.STRING },
          material_change: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER },
          template_excerpt: { type: Type.STRING },
          submitted_excerpt: { type: Type.STRING },
          reason: { type: Type.STRING },
          page_refs_template: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER }
          },
          page_refs_submitted: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER }
          }
        },
        required: [
          "clause_id",
          "title",
          "change_type",
          "risk",
          "material_change",
          "confidence",
          "template_excerpt",
          "submitted_excerpt",
          "reason",
          "page_refs_template",
          "page_refs_submitted"
        ]
      }
    },
    summary: { type: Type.STRING }
  },
  required: [
    "overall_risk",
    "recommended_action",
    "overall_confidence",
    "document_quality",
    "field_differences",
    "clause_differences",
    "summary"
  ]
};
