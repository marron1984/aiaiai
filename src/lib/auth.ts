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
 * ログイン処理
 * ユーザー名・パスワードを検証し、セッションCookieをセット
 */
export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
  } catch {
    return { success: false, error: "ログイン処理でエラーが発生しました" };
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
