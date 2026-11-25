import { testStalwartConnection, stalwartConfigured } from "@/lib/stalwart";
import { superAdminGate } from "@/lib/guard";

/**
 * Admin-only endpoint to test Stalwart Mail Server connection.
 *
 * POST /api/admin/stalwart/test
 * Authorization: Bearer <super_admin_token>
 */
export async function POST(request: Request) {
  const denied = superAdminGate(request);
  if (denied) return denied;

  if (!stalwartConfigured()) {
    return Response.json(
      {
        success: false,
        message: "Stalwart is not configured",
        requiredEnvVars: [
          "STALWART_HOST",
          "STALWART_PORT",
          "STALWART_ADMIN_USERNAME",
          "STALWART_ADMIN_PASSWORD",
          "STALWART_USE_HTTPS",
        ],
      },
      { status: 503 },
    );
  }

  try {
    const result = await testStalwartConnection();

    if (result.success) {
      return Response.json({
        success: true,
        message: "Stalwart connection successful",
        data: result.data,
      });
    } else {
      return Response.json(
        {
          success: false,
          message: "Failed to connect to Stalwart",
          error: result.error,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Stalwart test error:", error);
    return Response.json(
      {
        success: false,
        message: "Stalwart test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
