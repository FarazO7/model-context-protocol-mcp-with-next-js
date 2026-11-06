"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  ActivityIcon,
  BriefcaseIcon,
  CloseIcon,
  DashboardIcon,
  LogOutIcon,
  MenuIcon,
  NotesIcon,
  PlugIcon,
  SettingsIcon,
} from "./icons";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/engagements", label: "Engagements", Icon: BriefcaseIcon },
  { href: "/activity", label: "Activity", Icon: ActivityIcon },
  { href: "/connect", label: "Connect Claude", Icon: PlugIcon },
  { href: "/about", label: "Prototype notes", Icon: NotesIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

// A milestone page belongs under the dashboard it was opened from.
const isActive = (path: string, href: string) =>
  path === href || path.startsWith(`${href}/`) || (href === "/dashboard" && path.startsWith("/milestones/"));

type Props = { workspace: string; user: string; logOut: () => Promise<void> };

function Brand() {
  return (
    <span className="flex items-center gap-2.5 font-semibold tracking-tight text-white">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-deep text-sm shadow-lg shadow-brand/30">
        P
      </span>
      ProofFlow
    </span>
  );
}

function NavBody({ path, workspace, user, logOut, onNavigate }: Props & { path: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Main" className="mt-8 flex-1 space-y-1">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand" />}
              <Icon className={`h-5 w-5 ${active ? "text-brand" : "text-white/50 group-hover:text-brand"}`} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-white/10 pt-4 text-sm">
        <p className="truncate font-medium text-white">{workspace}</p>
        <p className="truncate text-white/60">{user}</p>
        <form action={logOut} className="mt-3">
          <button className="flex items-center gap-2 rounded-lg px-1 py-1 text-white/70 transition-colors hover:text-white">
            <LogOutIcon className="h-4 w-4" />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

/** Charcoal sidebar on wide screens; on phones, a top bar whose menu opens the same links in a drawer. */
export function AppNav(props: Props) {
  const path = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);

  // Close the drawer when the page changes; the dialog returns focus to the menu button itself.
  useEffect(() => drawer.current?.close(), [path]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-charcoal px-4 py-6 lg:flex">
        <Link href="/dashboard" className="px-2">
          <Brand />
        </Link>
        <NavBody path={path} {...props} />
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between bg-charcoal px-4 py-3 lg:hidden">
        <Link href="/dashboard">
          <Brand />
        </Link>
        <button
          type="button"
          onClick={() => drawer.current?.showModal()}
          aria-label="Open menu"
          className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <MenuIcon />
        </button>
      </div>

      <dialog
        ref={drawer}
        aria-label="Menu"
        onClick={(e) => e.target === drawer.current && drawer.current.close()}
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-0 bg-charcoal p-0 px-4 py-6 text-white backdrop:bg-ink/50 backdrop:backdrop-blur-sm open:motion-safe:animate-drawer-in lg:hidden"
      >
        <div className="flex items-center justify-between px-2">
          <Brand />
          <button
            type="button"
            onClick={() => drawer.current?.close()}
            aria-label="Close menu"
            autoFocus
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="h-[calc(100%-3rem)]">
          <NavBody path={path} {...props} onNavigate={() => drawer.current?.close()} />
        </div>
      </dialog>
    </>
  );
}
