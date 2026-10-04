import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined, "/setup");
  const linkFailed = params.error === "link";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="nameplate block text-[clamp(1.7rem,8vw,2.9rem)] no-underline">
        The Morning Edition
      </Link>
      <div className="folio mb-8">
        <span>Subscriptions desk</span>
        <span />
        <span>Free, one reader</span>
      </div>
      <h1 className="lead-headline text-[2rem]!">Start your subscription</h1>
      <p className="mb-6 mt-2 text-ink-soft">
        Sign in with your email. No password; we send a link. Your paper is built only from the apps you connect next,
        and only ever reads from them.
      </p>
      {linkFailed && (
        <p role="alert" className="mb-4 border border-accent px-3 py-2 text-sm text-accent">
          That sign-in link was expired or already used. Request a fresh one below.
        </p>
      )}
      <LoginForm next={next} />
      <p className="mt-8 text-sm text-ink-soft">
        Just looking? <Link href="/sample">Read a sample edition</Link>.
      </p>
    </main>
  );
}
