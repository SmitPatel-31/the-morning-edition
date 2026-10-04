"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentReader } from "@/lib/auth";
import { SOURCES } from "@/lib/composio/toolkits";
import { SettingsSchema, updateReader } from "@/lib/db/users";
import { isValidTimeZone } from "@/lib/time";

export type SaveResult = { ok: true } | { ok: false; error: string };

const Input = z.object({
  timezone: z.string().refine(isValidTimeZone, "Pick a timezone from the list."),
  sections: z.object(Object.fromEntries(SOURCES.map((s) => [s, z.boolean()])) as Record<(typeof SOURCES)[number], z.ZodBoolean>),
  slackChannels: z.array(z.object({ id: z.string().regex(/^[A-Z0-9]+$/), name: z.string().max(80) })).max(10, "Pick up to ten channels."),
});

export async function saveSettings(input: z.input<typeof Input>): Promise<SaveResult> {
  const reader = await currentReader();
  if (!reader) return { ok: false, error: "Your session ended. Sign in again." };

  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Those settings didn't look right." };
  if (!Object.values(parsed.data.sections).some(Boolean)) {
    return { ok: false, error: "Keep at least one section, or there's nothing to print." };
  }

  await updateReader(reader.id, {
    timezone: parsed.data.timezone,
    settings: SettingsSchema.parse({ sections: parsed.data.sections, slackChannels: parsed.data.slackChannels }),
  });
  revalidatePath("/settings");
  revalidatePath("/today");
  return { ok: true };
}
