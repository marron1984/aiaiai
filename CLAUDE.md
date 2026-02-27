# CLAUDE.md — AI Assistant Guide for `aiaiai`

## プロジェクト概要

**aiaiai** は「日々進化するAI情報を一手に集約する高品質日本語情報サイト」です。
ニュース転載サイトではなく、**公式一次情報を最優先**に収集し、重複統合（Topic Cluster）と実務者向け再構成要約で「読む価値順」に提示する情報インフラです。

### コンセプト
- 公式一次情報（リリースノート、changelog、GitHub Releases）を中心に収集
- 重複統合により「結局どれを読めばいいか」を1本に束ねる
- 実務者向け再構成要約（差分・影響・アクション）で一覧だけで判断可能に
- X（Twitter）は規約遵守の範囲で"速報補助"として扱い、裏取り前は隔離ラベル

### 対象プロダクト（MVP）
| 監視対象 | 公式一次情報 | 構造化更新 | X（補助） |
|---|---|---|---|
| ChatGPT/UI更新 | ChatGPT リリースノート（日本語含む） | — | 公式アカウント（API/埋め込みのみ） |
| OpenAI Developers/API | Developers changelog（RSSあり）/ API changelog | GitHub Releases（SDK等） | 同上 |
| Claude Developer Platform | Release notes（API/SDK/Console） | — | 同上 |
| Claude Code | 公式CHANGELOG（GitHub） | GitHub Releases | 同上 |
| Gemini | 公式アップデートハブ / アプリリリースノート | Gemini API changelog | 同上 |

---

## 技術スタック

| 領域 | 技術 | 備考 |
|---|---|---|
| フレームワーク | **Next.js**（App Router）+ TypeScript | Route HandlersでAPIとUIを単一リポで運用 |
| DB | **PostgreSQL** + **Prisma** | ORM/マイグレーション |
| UI | **Tailwind CSS** + **shadcn/ui** | |
| 定期実行 | **Vercel Cron Jobs** | `vercel.json`でスケジュール定義 |
| 検索 | **PostgreSQL FTS**（MVP） | 将来Meilisearch等に差し替え可能に設計 |
| デプロイ | **Vercel** | |

---

## ディレクトリ構成

```
.
├── app/
│   ├── (public)/                 # 公開ページ
│   │   ├── page.tsx              # トップ
│   │   ├── latest/page.tsx       # 最新一覧
│   │   ├── article/[slug]/page.tsx
│   │   ├── products/[slug]/page.tsx
│   │   ├── topics/[slug]/page.tsx
│   │   ├── compare/page.tsx
│   │   ├── weekly/page.tsx       # 週次ダイジェスト
│   │   └── search/page.tsx
│   ├── (admin)/                  # 管理画面
│   │   ├── admin/page.tsx
│   │   ├── admin/sources/page.tsx
│   │   ├── admin/articles/page.tsx
│   │   ├── admin/jobs/page.tsx
│   │   └── admin/settings/page.tsx
│   └── api/                      # APIエンドポイント
│       ├── cron/daily/route.ts
│       ├── ingest/manual/route.ts
│       ├── search/route.ts
│       └── sitemap/route.ts
├── ingestion/                    # 収集パイプライン
│   ├── sources/                  # ソース定義（YAML/TS）
│   ├── fetchers/                 # RSS/HTML/GitHub/X取得
│   ├── parsers/                  # 抽出
│   ├── normalize/                # URL正規化
│   ├── dedupe/                   # 重複統合クラスタリング
│   ├── summarize/                # 要約生成
│   ├── score/                    # スコアリング
│   └── jobs/                     # daily/hourly等ジョブ
├── prisma/
│   ├── schema.prisma             # データモデル定義
│   └── seed.ts                   # シードデータ
├── docs/                         # 設計ドキュメント群
├── TASKS.md                      # タスク分解（優先度・見積付き）
├── CLAUDE.md                     # 本ファイル
├── README.md
├── .env.example
└── vercel.json                   # Vercel設定（Cron含む）
```

---

## データモデル概要

主要エンティティ：

| エンティティ | 目的 | 主なフィールド |
|---|---|---|
| **Source** | 取得対象定義 | 種別（official/rss/github/x）、取得頻度、信頼スコア、規約メモ |
| **FetchJob / JobRun** | 実行管理 | status、starts/endsAt、error、itemsFetched |
| **RawItem** | 取得物（生データ） | sourceId、canonicalUrl、title、publishedAt、contentHash |
| **TopicCluster** | 重複統合単位 | clusterKey、representativeRawItemId、labels |
| **Article** | 公開単位 | slug、summary3、summaryLong、whatChanged、whoImpacted、actions、scores、status |
| **Tag / Taxonomy** | 多軸分類 | axis（product/theme/level/usecase）、name、slug |
| **ArticleTag** | 多対多 | articleId、tagId |
| **LegalEvent** | 法務/削除対応 | requestType、status、notes、actedAt |
| **AuditLog** | 監査 | actor、action、target、diff |

---

## 収集パイプライン

```
Fetch → Parse → Normalize → Dedupe/Cluster → Enrich → Summarize → Score → Publish
```

- 各ステージは責務分離し、ソース追加が容易な構造にする
- 失敗時のリトライ・バックオフ・ジョブ履歴・監査ログを実装
- GitHub REST API: レート制限（未認証60回/時）前提でバックオフ・キャッシュ・ページング必須
- X: スクレイピング禁止。API/埋め込みのみ

### 重複排除アルゴリズム
| 段階 | 判定 | 備考 |
|---|---|---|
| 強一致 | canonicalUrl一致 | 最優先 |
| 中一致 | 正規化タイトル類似（Jaccard等） | 保守的に判定 |
| 弱一致 | 意味類似（埋め込み） | P1で導入可 |
| 代表決定 | 公式 > 準一次 > 二次 > SNS | ヒエラルキー固定 |

---

## 開発セットアップ

### 前提条件
- Node.js (v20+)
- PostgreSQL
- Git

### 起動手順

```bash
git clone <repo-url>
cd aiaiai
cp .env.example .env          # 環境変数を設定
npm install
npx prisma migrate dev        # DBマイグレーション
npx prisma db seed             # シードデータ投入
npm run dev                    # 開発サーバー起動
```

### 主要コマンド

```bash
npm run dev          # 開発サーバー
npm run build        # ビルド
npm run start        # プロダクション起動
npm run test         # テスト実行
npm run lint         # Linter
npx prisma studio    # DB GUI
npx prisma migrate dev  # マイグレーション
```

---

## ブランチ戦略・コミット規約

- フィーチャーブランチ: `claude/<description>-<id>` or `feature/<description>`
- PRベースでmainにマージ
- コミットメッセージは命令形（Add, Fix, Update, Remove）、1行目72文字以内

---

## テスト方針

| 種別 | MVP範囲 | 例 |
|---|---|---|
| ユニットテスト | 正規化/重複判定/スコア算出 | URL正規化ケース、同一トピック統合 |
| 収集テスト | 各Fetcher/Parser | 公式1ソースにつき最低1ケース |
| E2E（最小） | Top/検索/記事/管理 | cron実行→記事生成→公開反映 |

テストは必ず実行してからタスク完了とすること。

---

## SEO要件

- `robots.txt`: クロール制御（※インデックス除外にはnoindex等を使う）
- `sitemap.xml`: 自動生成、robots.txtに記載
- `canonical`: 重複URL統合（rel=canonical）
- `OGP`: Open Graph / Twitter Card
- `Article JSON-LD`: 構造化データ

---

## 法務・運用上の絶対ルール

1. **全文転載禁止**: 要約主体 + 出典明記 + 必要最小限の引用
2. **著作権法「引用」要件**: 公表物、公正な慣行、正当な範囲、出所明示を遵守
3. **X利用規約遵守**: スクレイピング禁止。API/埋め込みのみ
4. **robots.txt尊重**: 外部サイトのクロール制御を遵守、過負荷をかけない
5. **削除依頼対応**: 記事単位で非公開/削除/ソース停止を即時実行可能に
6. **誤情報隔離**: SNS速報は「速報」ラベルで隔離、公式情報に紐づいたら昇格
7. **監査ログ**: 法務リクエスト・削除・ソース遮断はすべてログ記録

---

## 生成すべき成果物（ファイル一覧）

| 種別 | ファイル |
|---|---|
| 企画/要件 | `docs/project-brief.md`, `docs/mvp-scope.md`, `docs/future-roadmap.md` |
| 調査 | `docs/competitor-analysis.md` |
| IA/コンテンツ | `docs/information-architecture.md`, `docs/content-strategy.md` |
| 技術/データ | `docs/ingestion-architecture.md`, `docs/data-model.md`, `docs/scoring-ranking-design.md` |
| 管理/デザイン/SEO | `docs/admin-console-spec.md`, `docs/design-system.md`, `docs/seo-strategy.md` |
| 実行計画 | `TASKS.md` |
| 実装 | `app/**`, `ingestion/**`, `prisma/schema.prisma`, `prisma/seed.ts` |
| 運用 | `README.md`, `.env.example`, `vercel.json` |

---

## 実装の進め方（順序固定）

1. `docs/project-brief.md` を作成（未指定事項/仮定/成功基準）
2. 競合調査 → `docs/competitor-analysis.md`
3. IA/タグ/検索仕様 → `docs/information-architecture.md`
4. MVP範囲 → `docs/mvp-scope.md`
5. データモデル → `docs/data-model.md` + `prisma/schema.prisma`
6. 収集設計 → `docs/ingestion-architecture.md`
7. タスク分解 → `TASKS.md`（見積付き）
8. 実装: seed → 実データ → 管理画面 → SEO → デプロイ
9. テスト実行で検証し、READMEまで整備
10. 最終確認: 規約/robots/引用/削除対応/監査ログが実装として成立

**Explore → Plan → Implement → Verify** のサイクルを厳守。

---

## AIアシスタント向けルール

1. **ファイルを読んでから編集する** — 既存コードを理解してから変更
2. **最小限の変更** — 依頼された変更のみ実施、過剰な拡張をしない
3. **秘密情報をコミットしない** — `.env`、APIキー、認証情報は絶対にコミットしない
4. **このファイルを更新する** — 新しいツール/フレームワーク/規約追加時はCLAUDE.mdも更新
5. **テストを実行する** — 変更後は必ずテストを実行して検証
6. **既存パターンに従う** — コードベースのスタイル・規約を踏襲
7. **法務ルールを遵守する** — 全文転載禁止、X規約遵守、引用要件遵守
8. **日本語で出力する** — UIテキスト、要約、ドキュメントは日本語
