"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

export function LoginForm({ next }: { next: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(form: FormData) {
    const email = String(form.get("email") ?? "").trim();
    if (!email) return;
    setState({ kind: "sending" });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const redirect = new URL("/auth/callback", window.location.origin);
    redirect.searchParams.set("next", next);
    redirect.searchParams.set("tz", tz);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect.toString() },
    });
    setState(error ? { kind: "error", message: error.message } : { kind: "sent", email });
  }

  if (state.kind === "sent") {
    return (
      <div role="status" className="border-y border-rule py-4">
        <p className="font-[family-name:var(--font-playfair)] text-xl font-bold">Check your post.</p>
        <p className="mt-1 text-ink-soft">
          A sign-in link is on its way to <strong className="text-ink">{state.email}</strong>. Open it on this device and
          you&rsquo;ll land at the press.
        </p>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-3">
      <label htmlFor="email" className="dateline block">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="field"
      />
      <button type="submit" className="press-button w-full justify-center" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Sending the link…" : "Email me a sign-in link"}
      </button>
      {state.kind === "error" && (
        <p role="alert" className="text-sm text-accent">
          The link couldn&rsquo;t be sent: {state.message}. Check the address and try again.
        </p>
      )}
    </form>
  );
}
