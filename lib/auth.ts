import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { signSession, verifySession } from "@/lib/crypto";
import { db } from "@/lib/db";

const COOKIE = "pf_session";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  return s;
}

export async function startSession(userId: ObjectId) {
  (await cookies()).set(COOKIE, signSession(userId.toHexString(), secret(), WEEK_MS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: WEEK_MS / 1000,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/**
 * The signed-in user and their workspace, or a redirect to /login.
 * Call it in every page, Server Action and route that needs a login: layouts alone don't protect them.
 */
export const requireSession = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  const uid = token ? verifySession(token, secret()) : null;
  const user = uid
    ? await db().users.findOne({ _id: new ObjectId(uid) }, { projection: { password_hash: 0 } })
    : null;
  const workspace = user ? await db().workspaces.findOne({ _id: user.workspace_id }) : null;
  if (!user || !workspace) redirect("/login");
  return { user, workspace };
});
