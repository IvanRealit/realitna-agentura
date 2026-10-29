import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json(
      {
        status: "ok",
        ...(process.env.APP_ENV === "test"
          ? { environment: "test", testRunId: process.env.TEST_ISOLATION_ID }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
