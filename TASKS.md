# TASKS.md — aiaiai タスク分解（優先度・見積付き）

## 凡例

- **P0**: MVP必須（リリースブロッカー）
- **P1**: MVP直後に対応（初期改善）
- **P2**: 将来拡張

---

## Phase 1: 設計（P0 / 3人日）

| # | タスク | 優先度 | 見積 | 状態 |
|---|---|---:|---:|---|
| 1.1 | docs/project-brief.md 作成 | P0 | 0.5d | ✅ Done |
| 1.2 | docs/competitor-analysis.md 作成 | P0 | 0.5d | 🔄 進行中 |
| 1.3 | docs/information-architecture.md 作成 | P0 | 0.5d | 🔄 進行中 |
| 1.4 | docs/mvp-scope.md 作成 | P0 | 0.3d | 🔄 進行中 |
| 1.5 | docs/data-model.md 作成 | P0 | 0.5d | 🔄 進行中 |
| 1.6 | docs/ingestion-architecture.md 作成 | P0 | 0.5d | 🔄 進行中 |
| 1.7 | 残りdocs（content-strategy, seo, scoring, admin, design, roadmap） | P0 | 1.0d | 🔄 進行中 |
| 1.8 | TASKS.md 作成 | P0 | 0.2d | ✅ Done |

## Phase 2: 基盤セットアップ（P0 / 3人日）

| # | タスク | 優先度 | 見積 | 状態 |
|---|---|---:|---:|---|
| 2.1 | Next.js + TypeScript プロジェクト初期化 | P0 | 0.3d | ⬜ |
| 2.2 | Tailwind CSS + shadcn/ui セットアップ | P0 | 0.3d | ⬜ |
| 2.3 | PostgreSQL + Prisma セットアップ | P0 | 0.5d | ⬜ |
| 2.4 | prisma/schema.prisma 全エンティティ定義 | P0 | 0.5d | ⬜ |
| 2.5 | prisma/seed.ts シードデータ実装 | P0 | 0.5d | ⬜ |
| 2.6 | マイグレーション実行・動作確認 | P0 | 0.3d | ⬜ |
| 2.7 | .env.example / vercel.json 初期設定 | P0 | 0.2d | ⬜ |
| 2.8 | 共通レイアウト（ヘッダー/フッター/ナビ） | P0 | 0.4d | ⬜ |

## Phase 3: 収集パイプライン（P0 / 5人日）

| # | タスク | 優先度 | 見積 | 状態 |
|---|---|---:|---:|---|
| 3.1 | ingestion/sources/ ソース定義（YAML/TS） | P0 | 0.5d | ⬜ |
| 3.2 | ingestion/fetchers/ RSS fetcher | P0 | 0.5d | ⬜ |
| 3.3 | ingestion/fetchers/ HTML fetcher | P0 | 0.5d | ⬜ |
| 3.4 | ingestion/fetchers/ GitHub Releases fetcher | P0 | 0.7d | ⬜ |
| 3.5 | ingestion/parsers/ コンテンツ抽出 | P0 | 0.5d | ⬜ |
| 3.6 | ingestion/normalize/ URL正規化 | P0 | 0.3d | ⬜ |
| 3.7 | ingestion/normalize/ タイトル正規化 | P0 | 0.3d | ⬜ |
| 3.8 | ingestion/dedupe/ 重複判定（URL + タイトル類似） | P0 | 0.7d | ⬜ |
| 3.9 | ingestion/dedupe/ TopicCluster代表決定 | P0 | 0.3d | ⬜ |
| 3.10 | ingestion/summarize/ テンプレート要約生成 | P0 | 0.5d | ⬜ |
| 3.11 | ingestion/score/ スコアリング算出 | P0 | 0.5d | ⬜ |
| 3.12 | ingestion/jobs/ dailyジョブ統合 | P0 | 0.3d | ⬜ |
| 3.13 | app/api/cron/daily/route.ts Cronエンドポイント | P0 | 0.3d | ⬜ |

## Phase 4: 正規化・重複統合（P0 / 4人日）— Phase 3に含む

## Phase 5: 公開ページ（P0 / 5人日）

| # | タスク | 優先度 | 見積 | 状態 |
|---|---|---:|---:|---|
| 5.1 | app/(public)/page.tsx トップページ | P0 | 0.5d | ⬜ |
| 5.2 | app/(public)/latest/page.tsx 最新一覧 | P0 | 0.5d | ⬜ |
| 5.3 | app/(public)/article/[slug]/page.tsx 記事詳細 | P0 | 0.7d | ⬜ |
| 5.4 | app/(public)/products/[slug]/page.tsx プロダクト別 | P0 | 0.5d | ⬜ |
| 5.5 | app/(public)/topics/[slug]/page.tsx トピック別 | P0 | 0.5d | ⬜ |
| 5.6 | app/(public)/search/page.tsx 検索 | P0 | 0.7d | ⬜ |
| 5.7 | app/(public)/compare/page.tsx 比較 | P0 | 0.5d | ⬜ |
| 5.8 | app/(public)/weekly/page.tsx 週次ダイジェスト | P0 | 0.5d | ⬜ |
| 5.9 | app/api/search/route.ts 検索API（PostgreSQL FTS） | P0 | 0.5d | ⬜ |

## Phase 6: 管理画面（P0 / 5人日）

| # | タスク | 優先度 | 見積 | 状態 |
|---|---|---:|---:|---|
| 6.1 | app/(admin)/admin/page.tsx ダッシュボード | P0 | 0.5d | ⬜ |
| 6.2 | app/(admin)/admin/sources/page.tsx ソース管理 | P0 | 1.0d | ⬜ |
| 6.3 | app/(admin)/admin/articles/page.tsx 記事管理 | P0 | 1.0d | ⬜ |
| 6.4 | app/(admin)/admin/jobs/page.tsx ジョブ管理 | P0 | 0.7d | ⬜ |
| 6.5 | app/(admin)/admin/settings/page.tsx 設定・法務 | P0 | 0.5d | ⬜ |
| 6.6 | 管理API（承認/非公開/再生成/停止/統合） | P0 | 1.0d | ⬜ |

## Phase 7: SEO（P0 / 2人日）

| # | タスク | 優先度 | 見積 | 状態 |
|---|---|---:|---:|---|
| 7.1 | robots.txt 実装 | P0 | 0.2d | ⬜ |
| 7.2 | sitemap.xml 自動生成 | P0 | 0.3d | ⬜ |
| 7.3 | canonical / OGP メタデータ | P0 | 0.5d | ⬜ |
| 7.4 | Article JSON-LD 構造化データ | P0 | 0.3d | ⬜ |
| 7.5 | app/api/sitemap/route.ts | P0 | 0.3d | ⬜ |

## Phase 8: テスト（P0 / 3人日）

| # | タスク | 優先度 | 見積 | 状態 |
|---|---|---:|---:|---|
| 8.1 | URL正規化ユニットテスト | P0 | 0.3d | ⬜ |
| 8.2 | タイトル正規化ユニットテスト | P0 | 0.3d | ⬜ |
| 8.3 | 重複判定ユニットテスト | P0 | 0.3d | ⬜ |
| 8.4 | スコアリングユニットテスト | P0 | 0.3d | ⬜ |
| 8.5 | Fetcher/Parser 最小テスト | P0 | 0.5d | ⬜ |
| 8.6 | APIルート統合テスト | P0 | 0.5d | ⬜ |
| 8.7 | テスト実行・CI確認 | P0 | 0.3d | ⬜ |

## Phase 9: デプロイ・運用（P0 / 2人日）

| # | タスク | 優先度 | 見積 | 状態 |
|---|---|---:|---:|---|
| 9.1 | vercel.json Cron定義 | P0 | 0.2d | ⬜ |
| 9.2 | README.md 整備 | P0 | 0.5d | ⬜ |
| 9.3 | .env.example 整備 | P0 | 0.2d | ⬜ |
| 9.4 | ビルド成功確認 | P0 | 0.3d | ⬜ |

## Phase 10: 将来拡張（P1/P2）

| # | タスク | 優先度 | 見積 | 状態 |
|---|---|---:|---:|---|
| 10.1 | X API連携（規約準拠） | P1 | 2.0d | ⬜ |
| 10.2 | LLM要約API連携 | P1 | 2.0d | ⬜ |
| 10.3 | RSS配信 | P1 | 1.0d | ⬜ |
| 10.4 | ニュースレター | P1 | 2.0d | ⬜ |
| 10.5 | 公開API | P1 | 2.0d | ⬜ |
| 10.6 | 意味類似（埋め込み）による重複判定 | P1 | 2.0d | ⬜ |
| 10.7 | 会員機能（保存/通知/おすすめ） | P2 | 5.0d | ⬜ |
| 10.8 | Slack/LINE配信 | P2 | 2.0d | ⬜ |
| 10.9 | AIチャットナビ（RAG） | P2 | 5.0d | ⬜ |
| 10.10 | 法人向けダッシュボード | P2 | 5.0d | ⬜ |

---

## 合計見積

| フェーズ | 人日 |
|---|---:|
| 設計 | 3 |
| 基盤 | 3 |
| 収集 | 5 |
| 公開ページ | 5 |
| 管理画面 | 5 |
| SEO | 2 |
| テスト | 3 |
| デプロイ | 2 |
| **MVP合計** | **28** |
