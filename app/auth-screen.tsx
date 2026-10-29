"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useNet } from "@/lib/net";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSignIn, useAuth, useUser } from "@clerk/clerk-react";
import { oauthRedirectTargets } from "@/lib/api/oauth";

type Mode = "signin" | "shop";

function errorCode(e: unknown): string | null {
  if (e && typeof e === "object" && "errors" in e && Array.isArray((e as { errors: unknown[] }).errors)) {
    const first = (e as { errors: { code?: unknown }[] }).errors[0];
    if (first && typeof first.code === "string") return first.code;
  }
  return null;
}

function errMessage(e: unknown): string {
  if (e && typeof e === "object" && "errors" in e && Array.isArray((e as { errors: unknown[] }).errors)) {
    const first = (e as { errors: { message?: unknown }[] }).errors[0];
    if (first && typeof first.message === "string") return first.message;
  }
  return e instanceof Error ? e.message : String(e);
}

export default function AuthScreen() {
  const router = useRouter();
  const { online } = useNet();
  const { isSignedIn } = useAuth();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const { isLoaded: userLoaded, user: userResource } = useUser();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn && userLoaded && userResource?.primaryEmailAddress) {
      router.replace("/home");
    }
  }, [isSignedIn, userLoaded, userResource, router]);

  async function send() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    if (!signInLoaded || !signIn) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: trimmed,
        strategy: "email_code",
      });
      if (result.status === "complete") {
        router.push("/home");
        return;
      }
      router.push(`/auth/code?email=${encodeURIComponent(trimmed)}&from=auth`);
    } catch (e) {
      if (errorCode(e) === "form_identifier_not_found" || errorCode(e) === "identifier_not_found") {
        router.push(`/auth/code?email=${encodeURIComponent(trimmed)}&new=1&from=auth`);
        return;
      }
      setError(errMessage(e) || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (!signInLoaded || !signIn || busy) return;
    setBusy(true);
    setError(null);
    const t = oauthRedirectTargets();
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: t.redirectUrl,
        redirectUrlComplete: t.redirectUrlComplete,
      });
    } catch (e) {
      setError(errMessage(e) || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (isSignedIn) {
    return (
      <div className="anim-fade flex min-h-dvh flex-col px-5 pt-10">
        <BrandMark />
        <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <p className="text-[14px] text-ink3">
            Signed in as{" "}
            {userLoaded && userResource
              ? `${userResource.primaryEmailAddress?.emailAddress ?? userResource.emailAddresses?.[0]?.emailAddress ?? "you"}`
              : "you"}
          </p>
          <Button className="mt-3 h-12 rounded-full" size="lg" block onClick={() => router.replace("/home")}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fade flex min-h-dvh flex-col px-5 pt-10">
      <BrandMark />
      <h1 className="mt-5 text-[26px]/7 font-bold tracking-[-0.02em] text-ink">Welcome to Nova POS</h1>
      <p className="mt-1 text-[15px] text-ink3">Sell, track stock and sync your whole team.</p>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "signin", label: "Sign in" },
            { value: "shop", label: "Create shop" },
          ]}
        />
        {mode === "shop" ? (
          <Button block size="lg" onClick={() => router.push("/shop/create")}>
            Create your shop
          </Button>
        ) : (
          <>
            <Input
              className="mt-3"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@shop.com"
              inputMode="email"
            />
            <Button
              className="mt-3 h-12 rounded-full"
              size="lg"
              block
              loading={busy}
              disabled={!online || busy}
              onClick={send}
              data-testid="auth-send"
            >
              Sign in
            </Button>
            <Button
              className="mt-2 h-12 rounded-full"
              variant="secondary"
              size="lg"
              block
              loading={busy}
              disabled={!online || busy}
              onClick={google}
              data-testid="auth-google"
            >
              Continue with Google
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() => setMode("shop")}
              data-testid="auth-signup-link"
            >
              New to Nova POS? Create a shop →
            </Button>
            {!online && (
              <p className="mt-3 rounded-card bg-surface2 px-3 py-2 text-[14px] text-ink3">
                You're offline — connect to Wi-Fi or data to sign in.
              </p>
            )}
          </>
        )}
      </div>

      {error && <p className="mt-2.5 text-[14px] text-danger">{error}</p>}

      <div className="mt-4 pb-8">
        <Button
          variant="secondary"
          block
          onClick={() => {
            router.push("/shop/create");
          }}
          data-testid="auth-offline"
        >
          Create a local shop first
        </Button>
        <p className="mt-2 text-center text-[13px] text-ink3">
          No account needed — connect one later from Settings.
        </p>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="size-12">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="#0a0e17" />
      <rect x="22" y="26" width="56" height="16" rx="5" fill="url(#g)" />
      <path d="M30 50h40l-4 24a4 4 0 0 1-4 3.4H38a4 4 0 0 1-4-3.4Z" fill="url(#g)" opacity=".9" />
      <circle cx="40" cy="66" r="3.4" fill="#0a0e17" />
      <circle cx="60" cy="66" r="3.4" fill="#0a0e17" />
    </svg>
  );
}
