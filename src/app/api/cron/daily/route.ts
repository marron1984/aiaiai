import { NextRequest, NextResponse } from "next/server";
import { runDailyJob } from "../../../../../ingestion/jobs/daily";

/**
 * 日次Cronエンドポイント
 * Vercel Cron Jobs から呼び出される
 * vercel.json: schedule "0 20 * * *" (UTC 20:00 = JST 05:00)
 */
export async function GET(request: NextRequest) {
  // Cron認証チェック
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyJob();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
