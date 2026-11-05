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
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <Link href="/dashboard" className="font-semibold">
              ProofFlow
            </Link>
            <span className="text-sm text-neutral-600">{workspace.name}</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/connect" className="hover:underline">
              Connect Claude
            </Link>
            <Link href="/about" className="hover:underline">
              Prototype notes
            </Link>
            <form action={logOut} className="flex items-center gap-3">
              <span className="text-neutral-600">{user.name}</span>
              <button className="underline hover:text-neutral-600">Log out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-xs text-neutral-500 sm:px-6">
        Prototype. All demo data is fictional.{" "}
        <Link href="/about" className="underline">
          Prototype notes
        </Link>
      </footer>
    </div>
  );
}
