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

const field = "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">ProofFlow</h1>
      <p className="mt-1 text-sm text-neutral-600">Log in to your workspace.</p>
      <form action={logIn} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" autoComplete="email" required className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" autoComplete="current-password" required className={field} />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            Email or password is incorrect.
          </p>
        )}
        <button className="w-full rounded-md bg-neutral-900 px-3 py-2 font-medium text-white hover:bg-neutral-700">
          Log in
        </button>
      </form>
      <p className="mt-10 text-xs text-neutral-500">Prototype. All demo data is fictional.</p>
    </main>
  );
}
