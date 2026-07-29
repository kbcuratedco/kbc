import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";
import logo from "@/assets/kbc-logo-transparent.png";
import { claimAdmin } from "@/lib/products.functions";

function isSafeNext(next: string | undefined): next is string {
  return !!next && next.startsWith("/") && !next.startsWith("//");
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — KB Curated Co" },
      { name: "description", content: "Sign in to KB Curated Co." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingEmail, setExistingEmail] = useState<string | null>(null);
  const claimAdminFn = useServerFn(claimAdmin);

  const safeNext = isSafeNext(next) ? next : "/";

  const maybeClaimAdmin = useCallback(async () => {
    try {
      await claimAdminFn();
    } catch {
      // Ignore — only the owner email can claim admin.
    }
  }, [claimAdminFn]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setExistingEmail(data.session?.user?.email ?? null);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await maybeClaimAdmin();
        navigate({ to: safeNext, replace: true });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, safeNext, maybeClaimAdmin]);

  async function handleContinue() {
    await maybeClaimAdmin();
    navigate({ to: safeNext, replace: true });
  }

  async function handleSignOut() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setExistingEmail(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(safeNext)}` },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/invalid.*credentials/i.test(error.message)) {
            throw new Error("Wrong email or password. If you haven't signed up yet, tap 'Create an account'.");
          }
          if (/email.*not.*confirm/i.test(error.message)) {
            throw new Error("Please confirm your email first — check your inbox for the confirmation link.");
          }
          throw error;
        }
        await maybeClaimAdmin();
        navigate({ to: safeNext, replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth?next=${encodeURIComponent(safeNext)}`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      await maybeClaimAdmin();
      navigate({ to: safeNext, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md paper-card p-8">
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="KB Curated Co" className="h-24 w-24 object-contain" />
          <h1 className="mt-4 font-display text-3xl">Welcome to KB Curated Co</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {checking
              ? "Checking your session…"
              : existingEmail
              ? `Signed in as ${existingEmail}`
              : mode === "signin"
              ? "Sign in to continue"
              : "Create an account to continue"}
          </p>
        </div>

        {checking ? (
          <div className="mt-8 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : existingEmail ? (
          <div className="mt-6 space-y-3">
            <Button className="w-full" onClick={handleContinue} disabled={loading}>
              Continue
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
              disabled={loading}
            >
              Sign out & use a different account
            </Button>
          </div>
        ) : (
          <>
        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          onClick={handleGoogle}
          disabled={loading}
        >
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
          </>
        )}
      </div>
    </div>
  );
}