"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  displayName: string;
  role: string;
};

export function UserMenu({ displayName, role }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        {displayName}
        {role === "ADMIN" && (
          <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
            管理者
          </span>
        )}
      </span>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        {loading ? "..." : "ログアウト"}
      </button>
    </div>
  );
}
