import { z } from "zod";

/**
 * What Gemini must return. Kept deliberately flat and small: Gemini's
 * structured output supports a subset of JSON Schema, and every field here
 * is something the layout actually renders.
 */

const importance = z.number().int().min(1).max(10);
const importanceReason = z.string().min(1).max(160);
const sourceIds = z.array(z.string().min(1)).min(1).max(6);

export const SECTIONS = ["Inbox", "Calendar", "Code Review", "Slack", "Around the Office"] as const;

export const EditorStorySchema = z.object({
  headline: z.string().min(3).max(110),
  body: z.string().min(10).max(700),
  section: z.enum(SECTIONS),
  sourceIds,
  importance,
  importanceReason,
});

export const EditorOutputSchema = z.object({
  lead: EditorStorySchema.extend({
    deck: z.string().min(3).max(180),
    body: z.string().min(40).max(1200),
  }),
  stories: z.array(EditorStorySchema).max(6),
  schedule: z
    .array(
      z.object({
        sourceId: z.string().min(1),
        note: z.string().max(120),
        importance,
        importanceReason,
      }),
    )
    .max(30),
  pullRequests: z
    .array(
      z.object({
        sourceId: z.string().min(1),
        note: z.string().max(140),
        importance,
        importanceReason,
      }),
    )
    .max(20),
  weather: z.object({
    forecast: z.string().min(3).max(140),
    busyness: z.number().int().min(1).max(5),
  }),
});

export type EditorStory = z.infer<typeof EditorStorySchema>;
export type EditorOutput = z.infer<typeof EditorOutputSchema>;

/** JSON Schema handed to Gemini as `responseJsonSchema`. */
export function editorJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(EditorOutputSchema, { target: "draft-7" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
