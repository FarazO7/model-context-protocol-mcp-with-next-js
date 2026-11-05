import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const { workspace } = await requireSession();
  const count = await db().milestones.countDocuments({ workspace_id: workspace._id });
  return (
    <>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-neutral-600">
        {count} {count === 1 ? "milestone" : "milestones"} in this workspace.
      </p>
    </>
  );
}
