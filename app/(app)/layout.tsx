import Link from "next/link";
import { redirect } from "next/navigation";
import { endSession, requireSession } from "@/lib/auth";

async function logOut() {
  "use server";
  await endSession();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireSession();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-baseline gap-3">
            <Link href="/dashboard" className="font-semibold">
              ProofFlow
            </Link>
            <span className="text-sm text-neutral-600">{workspace.name}</span>
          </div>
          <form action={logOut} className="flex items-center gap-3 text-sm">
            <span className="text-neutral-600">{user.name}</span>
            <button className="underline hover:text-neutral-600">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      <footer className="mx-auto w-full max-w-7xl px-6 pb-8 text-xs text-neutral-500">
        Prototype. All demo data is fictional.
      </footer>
    </div>
  );
}
