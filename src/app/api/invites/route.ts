import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/invites
 * 
 * Lists members of the current user's organization.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // In a real multi-tenant setup, we'd filter by orgId.
    // For now, we return all users as a base implementation of the 'Team' view.
    const members = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    }).from(user);

    return NextResponse.json({
      object: "list",
      data: members.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: "admin", // Default role for now
        created_at: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
