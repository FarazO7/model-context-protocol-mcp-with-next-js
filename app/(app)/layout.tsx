import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { endSession, requireSession } from "@/lib/auth";

async function logOut() {
  "use server";
  await endSession();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireSession();
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:pl-64">
      <AppNav workspace={workspace.name} user={user.name} logOut={logOut} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</main>
      <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-xs text-muted sm:px-6 lg:px-10">
        Prototype. All demo data is fictional.{" "}
        <Link href="/about" className="underline underline-offset-2 hover:text-ink">
          Prototype notes
        </Link>
      </footer>
    </div>
  );
}
