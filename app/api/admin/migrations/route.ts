import { runMigrations } from "@/lib/migrations";
import { superAdminGate } from "@/lib/guard";

/**
 * Admin-only endpoint to run database migrations.
 * Adds missing PRD tables safely.
 *
 * POST /api/admin/migrations
 * Authorization: Bearer <super_admin_token>
 */
export async function POST(request: Request) {
  const denied = superAdminGate(request);
  if (denied) return denied;

  try {
    await runMigrations();
    return Response.json({
      success: true,
      message: "Migrations completed successfully",
      tables: [
        "company_users",
        "subscriptions",
        "invoices",
        "mailbox_aliases",
        "email_forwarding_rules",
        "storage_usage",
        "usage_logs",
        "audit_logs",
        "notifications",
      ],
    });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json(
      {
        success: false,
        message: "Migration failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
