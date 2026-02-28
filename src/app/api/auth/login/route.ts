import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: "ユーザー名とパスワードを入力してください" },
      { status: 400 }
    );
  }

  const result = await login(username, password);
  return NextResponse.json(result, { status: result.success ? 200 : 401 });
}
