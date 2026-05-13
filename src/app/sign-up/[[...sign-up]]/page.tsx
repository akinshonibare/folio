import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">folio</h1>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
            Multi-account portfolio tracker for stocks, options, and crypto.
          </p>
        </div>
        <SignUp signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
      </div>
    </main>
  );
}
