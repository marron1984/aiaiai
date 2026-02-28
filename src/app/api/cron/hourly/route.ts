import { NextRequest, NextResponse } from "next/server";
import { runHourlyJob } from "../../../../../ingestion/jobs/hourly";

/**
 * 毎時Cronエンドポイント
 * Vercel Cron Jobs から1時間ごとに呼び出される
 * vercel.json: schedule "0 * * * *" (毎時0分)
 */
export async function GET(request: NextRequest) {
  // Cron認証チェック
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runHourlyJob();

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
