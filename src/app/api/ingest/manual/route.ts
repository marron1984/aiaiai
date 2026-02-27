import { NextRequest, NextResponse } from "next/server";
import { runDailyJob } from "../../../../../ingestion/jobs/daily";

/**
 * 手動収集トリガーAPI（管理画面から利用）
 */
export async function POST(_request: NextRequest) {
  try {
    const result = await runDailyJob();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
