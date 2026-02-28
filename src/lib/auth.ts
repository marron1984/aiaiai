import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_COOKIE = "aiaiai_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30日

/**
 * セッショントークンを生成
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * パスワードのハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 初期ユーザーが存在しない場合に自動作成
 */
async function ensureInitialUsers(): Promise<void> {
  const count = await prisma.user.count();
  if (count > 0) return;

  console.log("[auth] No users found — creating initial users...");
  const adminHash = await hashPassword("admin123");
  const yoshidaHash = await hashPassword("yoshida123");

  await prisma.user.createMany({
    data: [
      { username: "admin", passwordHash: adminHash, displayName: "管理者", role: "ADMIN" },
      { username: "yoshida", passwordHash: yoshidaHash, displayName: "吉田", role: "VIEWER" },
    ],
    skipDuplicates: true,
  });
  console.log("[auth] Initial users created: admin / yoshida");
}

/**
 * ログイン処理
 * ユーザー名・パスワードを検証し、セッションCookieをセット
 */
export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 初回デプロイ時: ユーザーが0人なら自動作成
    await ensureInitialUsers();

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return { success: false, error: "ユーザー名またはパスワードが正しくありません" };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "ユーザー名またはパスワードが正しくありません" };
    }

    // セッショントークンを生成してCookieにセット
    // MVP: トークン = userId:hmac(userId, secret)
    const token = generateSessionToken();
    const sessionData = JSON.stringify({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      token,
    });

    const encoded = Buffer.from(sessionData).toString("base64");

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return { success: true };
  } catch (e) {
    console.error("[auth] login error:", e);
    const message = e instanceof Error ? e.message : "不明なエラー";
    return { success: false, error: `ログインエラー: ${message}` };
  }
}

/**
 * ログアウト処理
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * 現在のセッションを取得
 */
export async function getSession(): Promise<{
  userId: string;
  username: string;
  displayName: string;
  role: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    if (!sessionCookie?.value) return null;

    const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    const session = JSON.parse(decoded);

    if (!session.userId || !session.username) return null;

    return {
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      role: session.role,
    };
  } catch {
    return null;
  }
}

/**
 * 初期ユーザーを作成（シード用）
 */
export async function createUser(
  username: string,
  password: string,
  displayName: string,
  role: "ADMIN" | "VIEWER" = "VIEWER"
): Promise<void> {
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, displayName, role },
    create: { username, passwordHash, displayName, role },
  });
}
