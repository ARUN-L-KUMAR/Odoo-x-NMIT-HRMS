import { NextRequest } from "next/server";

/**
 * POST /api/auth/register — Deprecated.
 * Self-registration is not supported. Employees are created by HR Administrators.
 * Company first-time setup is handled by POST /api/auth/setup.
 */
export async function POST(req: NextRequest) {
  return Response.json(
    {
      success: false,
      error: {
        code: "NOT_SUPPORTED",
        message:
          "Self-registration is not supported. Employees are added by HR Administrators. For first-time company setup, use /api/auth/setup.",
      },
    },
    { status: 403 }
  );
}
