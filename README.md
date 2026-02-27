# aiaiai

日々進化するAI情報を一手に集約する高品質日本語情報サイト

## コンセプト

- **公式一次情報を最優先**に収集（リリースノート、changelog、GitHub Releases）
- **重複統合（Topic Cluster）**で「結局どれを読めばいいか」を1本に束ねる
- **実務者向け再構成要約**（差分・影響・アクション）で一覧だけで判断可能
- **スコアリング**による「読む価値順」の提示

## 対象プロダクト（MVP）

| プロダクト | 一次情報 |
|---|---|
| ChatGPT | 公式リリースノート（日本語/英語） |
| OpenAI API | Developers changelog（RSS） |
| Claude | Platform Release Notes |
| Claude Code | GitHub Releases |
| Gemini | 公式アップデートハブ、アプリリリースノート |

## 技術スタック

| 領域 | 技術 |
|---|---|
| フレームワーク | Next.js 16（App Router）+ TypeScript |
| DB | PostgreSQL + Prisma 6 |
| UI | Tailwind CSS 4 |
| 定期実行 | Vercel Cron Jobs |
| 検索 | PostgreSQL（MVP） |
| デプロイ | Vercel |

## セットアップ

### 前提条件

- Node.js v20+
- PostgreSQL
- Git

### 起動手順

```bash
git clone <repo-url>
cd aiaiai
cp .env.example .env          # 環境変数を設定（DATABASE_URLなど）
npm install
npx prisma migrate dev        # DBマイグレーション
npx prisma db seed            # シードデータ投入
npm run dev                   # 開発サーバー起動（http://localhost:3000）
```

### 主要コマンド

```bash
npm run dev          # 開発サーバー（Turbopack）
npm run build        # プロダクションビルド
npm run start        # プロダクション起動
npm run test         # テスト実行
npm run lint         # Linter
npx prisma studio    # DB GUI
npx prisma migrate dev  # マイグレーション
npx prisma db seed   # シードデータ投入
```

## ディレクトリ構成

```
.
├── src/app/
│   ├── (public)/              # 公開ページ
│   │   ├── page.tsx           # トップ
│   │   ├── latest/            # 最新一覧
│   │   ├── article/[slug]/    # 記事詳細
│   │   ├── products/[slug]/   # プロダクト別
│   │   ├── topics/[slug]/     # トピック別
│   │   ├── compare/           # 比較
│   │   ├── weekly/            # 週次ダイジェスト
│   │   └── search/            # 検索
│   ├── (admin)/               # 管理画面
│   │   └── admin/
│   │       ├── page.tsx       # ダッシュボード
│   │       ├── sources/       # ソース管理
│   │       ├── articles/      # 記事管理
│   │       ├── jobs/          # ジョブ管理
│   │       └── settings/      # 設定・法務
│   └── api/
│       ├── cron/daily/        # 日次Cron
│       ├── ingest/manual/     # 手動収集
│       ├── search/            # 検索API
│       └── sitemap/           # サイトマップ
├── ingestion/                 # 収集パイプライン
│   ├── sources/               # ソース定義
│   ├── fetchers/              # RSS/HTML/GitHub取得
│   ├── normalize/             # URL・タイトル正規化
│   ├── dedupe/                # 重複統合
│   ├── summarize/             # 要約生成
│   ├── score/                 # スコアリング
│   └── jobs/                  # ジョブ実行
├── prisma/
│   ├── schema.prisma          # データモデル
│   └── seed.ts                # シードデータ
├── docs/                      # 設計ドキュメント
├── __tests__/                 # テスト
└── vercel.json                # Vercel設定（Cron定義）
```

## 収集パイプライン

```
Fetch → Parse → Normalize → Dedupe/Cluster → Summarize → Score → 保存（Draft）
```

- 日次実行: Vercel Cron（UTC 20:00 = JST 05:00）
- 手動実行: `POST /api/ingest/manual`
- GitHub API: レート制限遵守（未認証60回/時、バックオフ付き）
- X: API/埋め込みのみ（スクレイピング禁止）

## Cron設定

`vercel.json` で定義：

```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 20 * * *"
    }
  ]
}
```

UTC 20:00 = JST 05:00（毎日早朝に収集）

## テスト

```bash
npm test
```

テスト対象:
- URL正規化
- タイトル正規化・類似度
- 重複判定・Topic Cluster統合
- スコアリング算出

## 法務・運用ルール

1. **全文転載禁止**: 要約主体＋出典明記＋必要最小限の引用
2. **著作権法「引用」要件遵守**: 公表物、公正な慣行、正当な範囲、出所明示
3. **X利用規約遵守**: スクレイピング禁止、API/埋め込みのみ
4. **robots.txt尊重**: 外部サイトのクロール制御を遵守
5. **削除依頼対応**: 管理画面から即時対応可能
6. **監査ログ**: 全操作をログ記録

## 設計ドキュメント

- [プロジェクトブリーフ](docs/project-brief.md)
- [競合分析](docs/competitor-analysis.md)
- [情報アーキテクチャ](docs/information-architecture.md)
- [MVPスコープ](docs/mvp-scope.md)
- [データモデル](docs/data-model.md)
- [収集アーキテクチャ](docs/ingestion-architecture.md)
- [コンテンツ戦略](docs/content-strategy.md)
- [SEO戦略](docs/seo-strategy.md)
- [スコアリング設計](docs/scoring-ranking-design.md)
- [管理画面仕様](docs/admin-console-spec.md)
- [デザインシステム](docs/design-system.md)
- [将来ロードマップ](docs/future-roadmap.md)

## ライセンス

ISC
