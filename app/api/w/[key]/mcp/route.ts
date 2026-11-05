import { createMcpHandler } from "mcp-handler";
import { db } from "@/lib/db";
import { instructions, registerTools } from "@/lib/mcp/tools";

// shortcut: the key in the URL is the connector's only credential (SPEC section 13), so it also shows in
// request logs. Move to OAuth before real customers connect.
async function handler(req: Request, { params }: RouteContext<"/api/w/[key]/mcp">) {
  const { key } = await params;
  const workspace = /^[A-Za-z0-9_-]{43}$/.test(key) ? await db().workspaces.findOne({ mcp_key: key }) : null;
  if (!workspace) {
    return new Response("This ProofFlow connector URL is not valid. Copy it again from the Connect Claude page.", {
      status: 401,
    });
  }
  // Stateless: one server per request, built for this workspace.
  return createMcpHandler((server) => registerTools(server, workspace), {
    serverInfo: { name: "ProofFlow", version: "0.1.0" },
    instructions: instructions(workspace),
  })(req);
}

export { handler as GET, handler as POST, handler as DELETE };
