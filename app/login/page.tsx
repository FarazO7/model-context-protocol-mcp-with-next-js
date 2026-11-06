import { redirect } from "next/navigation";
import { startSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";

async function logIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = email && password ? await db().users.findOne({ email }) : null;
  if (!user || !verifyPassword(password, user.password_hash)) redirect("/login?error=1");
  await startSession(user._id);
  redirect("/dashboard");
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="relative grid min-h-dvh flex-1 place-items-center overflow-hidden bg-charcoal px-4 py-12">
      {/* Soft blue light behind the panel, decorative only. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-[-10%] h-[32rem] w-[32rem] rounded-full bg-brand/35 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-[-8%] h-[28rem] w-[28rem] rounded-full bg-brand-deep/30 blur-3xl" />
      </div>

      {/* Glass over a dark background needs more white than glass on the canvas: 92% keeps grey text above 4.5:1. */}
      <div className="relative w-full max-w-sm rounded-[1.25rem] border border-white/50 bg-white/92 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8 motion-safe:animate-fade-in">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-deep font-semibold text-white shadow-lg shadow-brand/30">
            P
          </span>
          <span className="text-lg font-semibold tracking-tight">ProofFlow</span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 text-sm text-muted">Milestone acceptance and the payment clock, in one record.</p>

        <form action={logIn} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" autoComplete="email" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" autoComplete="current-password" required className="field" />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              Email or password is incorrect.
            </p>
          )}
          <button className="btn btn-primary w-full py-2.5">Log in</button>
        </form>
        <p className="mt-8 text-xs text-muted">Prototype. All demo data is fictional.</p>
      </div>
    </main>
  );
}
