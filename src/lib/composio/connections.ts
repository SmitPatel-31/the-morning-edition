import { composio } from "./client";
import { READ_ONLY_SCOPES, READ_TOOLS, SOURCES, type Source } from "./toolkits";

export type ConnectionStatus = "connected" | "pending" | "expired" | "not_connected";

export interface SourceConnection {
  source: Source;
  status: ConnectionStatus;
  connectedAccountId?: string;
}

const authConfigName = (source: Source) => `The Morning Edition: ${source} (read-only)`;
const authConfigCache = new Map<Source, Promise<string>>();

/**
 * Returns the id of this app's auth config for a toolkit, creating it on
 * first use. A pre-made config can be supplied with
 * COMPOSIO_AUTH_CONFIG_<SOURCE> (for example a custom OAuth app).
 *
 * The app creates its own config rather than using `toolkits.authorize()`:
 * that helper goes through `connectedAccounts.initiate()`, which Composio has
 * retired for managed OAuth. It also gives us a place to request read-only
 * scopes and restrict the config to our allowlisted tools.
 */
function ensureAuthConfig(source: Source): Promise<string> {
  const override = process.env[`COMPOSIO_AUTH_CONFIG_${source.toUpperCase()}`];
  if (override) return Promise.resolve(override);

  let pending = authConfigCache.get(source);
  if (!pending) {
    pending = findOrCreateAuthConfig(source);
    pending.catch(() => authConfigCache.delete(source));
    authConfigCache.set(source, pending);
  }
  return pending;
}

async function findOrCreateAuthConfig(source: Source): Promise<string> {
  const client = composio();
  const existing = await client.authConfigs.list({ toolkit: source, search: authConfigName(source) });
  const ours = existing.items.find((c) => c.name === authConfigName(source) && c.status === "ENABLED");
  if (ours) return ours.id;

  const scopes = READ_ONLY_SCOPES[source];
  const created = await client.authConfigs.create(source, {
    type: "use_composio_managed_auth",
    name: authConfigName(source),
    ...(scopes ? { credentials: { scopes } } : {}),
  });

  // Defense in depth: tell Composio this config may only run our read tools.
  try {
    await client.authConfigs.update(created.id, {
      type: "default",
      toolAccessConfig: { toolsAvailableForExecution: [...READ_TOOLS[source]] },
    });
  } catch (error) {
    console.warn(`[composio] could not restrict tools on ${source} auth config`, error);
  }
  return created.id;
}

/**
 * Starts Composio's hosted auth flow for one app under the reader's own
 * Composio user id. Returns the URL to send the browser to; Composio sends
 * the user back to `callbackUrl` with `status=success|failed`.
 */
export async function startConnection(
  composioUserId: string,
  source: Source,
  callbackUrl: string,
): Promise<string> {
  const authConfigId = await ensureAuthConfig(source);
  const request = await composio().connectedAccounts.link(composioUserId, authConfigId, {
    callbackUrl,
  });
  if (!request.redirectUrl) {
    throw new Error(`Composio did not return a redirect URL for ${source}`);
  }
  return request.redirectUrl;
}

/** Connection state for every source, from the reader's connected accounts. */
export async function listConnections(composioUserId: string): Promise<SourceConnection[]> {
  const accounts = await composio().connectedAccounts.list({
    userIds: [composioUserId],
    toolkitSlugs: [...SOURCES],
    orderBy: "updated_at",
  });

  return SOURCES.map((source) => {
    const forSource = accounts.items.filter((a) => a.toolkit.slug === source && !a.isDisabled);
    const active = forSource.find((a) => a.status === "ACTIVE");
    if (active) return { source, status: "connected", connectedAccountId: active.id };
    if (forSource.some((a) => a.status === "INITIATED" || a.status === "INITIALIZING")) {
      return { source, status: "pending" };
    }
    if (forSource.some((a) => a.status === "EXPIRED")) return { source, status: "expired" };
    return { source, status: "not_connected" };
  });
}
