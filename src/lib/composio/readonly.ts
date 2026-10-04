import { composio } from "./client";
import { isAllowedReadTool, toolkitOf, type ReadToolSlug } from "./toolkits";

export class ReadOnlyViolationError extends Error {
  constructor(slug: string, reason: string) {
    super(`Refusing to execute ${slug}: ${reason}`);
    this.name = "ReadOnlyViolationError";
  }
}

export class ToolExecutionError extends Error {
  constructor(
    readonly slug: string,
    message: string,
  ) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

const verified = new Map<string, Promise<void>>();

/**
 * Confirms with Composio that the tool is annotated read-only. This is the
 * second gate after the static allowlist: if a tool on the list were ever
 * re-tagged as mutating, the app stops calling it instead of trusting the
 * list. Fails closed. The result is cached per process.
 */
function verifyReadOnlyHint(slug: ReadToolSlug): Promise<void> {
  let check = verified.get(slug);
  if (!check) {
    check = composio()
      .tools.getRawComposioToolBySlug(slug)
      .then((tool) => {
        if (!tool.tags?.includes("readOnlyHint")) {
          throw new ReadOnlyViolationError(slug, "tool is not tagged readOnlyHint");
        }
      });
    check.catch(() => verified.delete(slug));
    verified.set(slug, check);
  }
  return check;
}

/**
 * The only way the app executes a Composio tool. Accepts allowlisted read
 * tools only and returns the tool's `data` payload as `unknown`, leaving the
 * shape to the per-source normalizers.
 */
export async function executeReadTool(
  slug: string,
  userId: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<unknown> {
  if (!isAllowedReadTool(slug)) {
    throw new ReadOnlyViolationError(slug, "not on the read-only allowlist");
  }
  await verifyReadOnlyHint(slug);

  const result = await composio().tools.execute(
    slug,
    { userId, arguments: args },
    signal ? { signal } : undefined,
  );
  if (!result.successful) {
    throw new ToolExecutionError(slug, result.error ?? `${toolkitOf(slug)} returned an error`);
  }
  return result.data;
}
