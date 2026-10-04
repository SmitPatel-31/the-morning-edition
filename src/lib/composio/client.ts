import { Composio } from "@composio/core";
import { GoogleProvider } from "@composio/google";
import { env } from "@/lib/env";
import { TOOLKIT_VERSIONS } from "./toolkits";

let instance: Composio<GoogleProvider> | undefined;

/**
 * Shared Composio client. The Google provider is configured so the same
 * client can hand tools to Gemini as function declarations; edition
 * gathering itself calls tools directly and never lets the model pick them.
 */
export function composio(): Composio<GoogleProvider> {
  instance ??= new Composio({
    apiKey: env.composioApiKey(),
    provider: new GoogleProvider(),
    toolkitVersions: TOOLKIT_VERSIONS,
    allowTracking: false,
  });
  return instance;
}
