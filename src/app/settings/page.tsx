import type { Metadata } from "next";
import { ReaderShell } from "@/components/paper/ReaderShell";
import { requireReader } from "@/lib/auth";
import { listConnections } from "@/lib/composio/connections";
import { listSlackChannels } from "@/lib/gather/fetchers";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const reader = await requireReader("/settings");
  const connections = await listConnections(reader.composioUserId).catch(() => null);
  const slackConnected = connections?.find((c) => c.source === "slack")?.status === "connected";

  const channels = slackConnected ? await listSlackChannels(reader.composioUserId).catch(() => null) : null;
  const slackStatus = !slackConnected ? "not_connected" : channels ? "connected" : "unavailable";

  return (
    <ReaderShell current="/settings">
      <div className="mx-auto max-w-2xl">
        <header className="pt-10 pb-8 text-center">
          <h1 className="lead-headline">Settings</h1>
          <p className="lead-deck border-0">How, when and from where your paper is written.</p>
        </header>
        <SettingsForm timezone={reader.timezone} settings={reader.settings} channels={channels} slackStatus={slackStatus} />
      </div>
    </ReaderShell>
  );
}
