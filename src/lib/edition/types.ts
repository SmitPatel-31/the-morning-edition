import { z } from "zod";
import { SOURCES } from "@/lib/composio/toolkits";
import { EditorStorySchema, SECTIONS } from "@/lib/editor/schema";

/**
 * The stored edition: everything the front page needs, so any past edition
 * can be re-rendered from the database alone. Validated on read as well as
 * on write, so a malformed row renders an error state instead of crashing.
 */

export const SourceRefSchema = z.object({
  kind: z.enum(["email", "event", "pull_request", "slack"]),
  label: z.string(),
  url: z.string().optional(),
});

export const StorySchema = EditorStorySchema.extend({
  deck: z.string().optional(),
});

export const ScheduleEntrySchema = z.object({
  sourceId: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
  location: z.string().optional(),
  url: z.string().optional(),
  note: z.string().optional(),
  importance: z.number().optional(),
  importanceReason: z.string().optional(),
});

export const PullRequestEntrySchema = z.object({
  sourceId: z.string(),
  title: z.string(),
  repo: z.string(),
  number: z.number(),
  author: z.string(),
  url: z.string(),
  createdAt: z.string(),
  draft: z.boolean(),
  note: z.string().optional(),
  importance: z.number().optional(),
  importanceReason: z.string().optional(),
});

export const SourceStatusSchema = z.object({
  status: z.enum(["ok", "not_connected", "error", "skipped"]),
  count: z.number(),
  note: z.string().optional(),
});

export const EditionSchema = z.object({
  version: z.literal(1),
  editionNumber: z.number().int().positive(),
  date: z.string(),
  timezone: z.string(),
  generatedAt: z.string(),
  model: z.string(),
  lead: StorySchema.nullable(),
  stories: z.array(StorySchema),
  schedule: z.array(ScheduleEntrySchema),
  pullRequests: z.array(PullRequestEntrySchema),
  weather: z.object({ forecast: z.string(), busyness: z.number() }),
  sources: z.object(Object.fromEntries(SOURCES.map((s) => [s, SourceStatusSchema])) as {
    [K in (typeof SOURCES)[number]]: typeof SourceStatusSchema;
  }),
  references: z.record(z.string(), SourceRefSchema),
});

export type Story = z.infer<typeof StorySchema>;
export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>;
export type PullRequestEntry = z.infer<typeof PullRequestEntrySchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type Edition = z.infer<typeof EditionSchema>;
export type Section = (typeof SECTIONS)[number];
