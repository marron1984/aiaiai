export function DbErrorBanner() {
  return (
    <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
      データベースに接続できません。しばらくお待ちいただくか、管理者にお問い合わせください。
    </div>
  );
}
