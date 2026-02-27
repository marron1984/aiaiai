# 収集パイプラインアーキテクチャ — aiaiai

## パイプライン概要

```
Fetch → Parse → Normalize → Dedupe/Cluster → Enrich → Summarize → Score → Publish
```

各ステージは責務分離し、ソース追加が容易な構造にする。

## ディレクトリ構成

```
ingestion/
├── sources/          # ソース定義（TS）
│   └── definitions.ts
├── fetchers/         # データ取得
│   ├── rss.ts        # RSS/Atomフィード取得
│   ├── html.ts       # HTMLページスクレイピング
│   └── github.ts     # GitHub Releases API
├── parsers/          # コンテンツ抽出
├── normalize/        # 正規化
│   ├── url.ts        # URL正規化
│   └── title.ts      # タイトル正規化
├── dedupe/           # 重複統合
│   └── dedup.ts      # 重複判定・Topic Cluster
├── summarize/        # 要約生成
│   └── template.ts   # テンプレート要約（MVP）
├── score/            # スコアリング
│   └── scoring.ts    # 合成スコア算出
└── jobs/             # ジョブ実行
    └── daily.ts      # 日次ジョブ
```

## ソース別取得戦略

### 公式changelog/リリースノート（HTML）

- **取得方法**: HTTP GET + Cheerio でHTML解析
- **更新検知**: ETag/If-Modified-Since（将来）
- **User-Agent**: `aiaiai-ingestion/1.0` を明記
- **頻度制御**: 日次（DAILY）
- **robots.txt尊重**: 対象サイトのrobots.txtを事前確認

### RSS/Atomフィード

- **取得方法**: `rss-parser` ライブラリ
- **対象例**: OpenAI Developers changelog（RSS配信あり）
- **更新検知**: pubDate比較
- **タイムアウト**: 10秒

### GitHub Releases（REST API）

- **取得方法**: GitHub REST API `/repos/{owner}/{repo}/releases`
- **レート制限**:
  - 未認証: 60回/時（IPベース）
  - 認証済み: 5,000回/時
- **対策**:
  - エクスポネンシャルバックオフ（最大3回リトライ）
  - 403/429ステータスでRetry-Afterヘッダー尊重
  - ページング: `per_page=10`（MVP）
  - 環境変数 `GITHUB_TOKEN` があれば認証利用
- **全文転載回避**: body は500文字に制限

### X（Twitter）

- **利用規約遵守**: スクレイピング禁止。API/埋め込みのみ。
- **MVP**: X連携はP1で実装（規約準拠の範囲でAPI利用）
- **隔離ラベル**: SNS由来は「速報」ラベルで隔離

## 正規化

### URL正規化

| 処理 | 説明 |
|---|---|
| トラッキングパラメータ除去 | `utm_*`, `fbclid`, `gclid` 等を除去 |
| プロトコル統一 | `http:` → `https:` |
| 末尾スラッシュ | ルート以外は除去 |
| フラグメント除去 | `#section` を除去 |
| 空クエリ除去 | `?` のみの場合除去 |

### タイトル正規化

| 処理 | 説明 |
|---|---|
| 絵文字除去 | Unicode絵文字パターンを除去 |
| 全角→半角 | 英数字の全角を半角に変換 |
| 全角スペース | 半角スペースに変換 |
| 連続空白圧縮 | 複数空白を1つに |
| トリム | 前後空白を除去 |

## 重複排除アルゴリズム（Topic Cluster）

### 判定段階

| 段階 | 判定方法 | 閾値 | 備考 |
|---|---|---|---|
| 強一致 | canonicalUrl一致 | 完全一致 | 最優先 |
| 中一致 | 正規化タイトル類似（Jaccard） | 0.6以上 | 保守的に判定 |
| 弱一致 | 意味類似（埋め込み） | — | P1で導入 |

### 代表記事決定

ソースタイプのヒエラルキーで固定:

```
OFFICIAL (4) > RSS (3) = GITHUB (3) > X (1)
```

同一クラスタ内で最も高い優先度のソースが代表記事となる。

## 要約生成

### MVPアプローチ（テンプレート方式）

全文転載を回避し、構造化テンプレートで要約を生成。

**記事ごとの必須フィールド**:

| フィールド | 説明 |
|---|---|
| summary3 | 3行要約（一覧で完結） |
| summaryLong | 詳細要約（記事ページ） |
| whatChanged | 何が新しいか（差分） |
| whoImpacted | 誰に影響があるか |
| actions | 実務でどう使えるか |
| recommendation | Try / Monitor / Ignore |

### P1でのLLM連携

- Claude/OpenAI/Gemini APIを利用した高品質要約
- 管理画面で「要約再生成」操作

## スコアリング

### 指標と重み

| 指標 | 重み | 算出方法 |
|---|---|---|
| 信頼性 | 0.30 | ソースヒエラルキー × 25 |
| 有用性 | 0.25 | キーワードベース判定 |
| 重要度 | 0.20 | 料金/API/セキュリティ等の検出 |
| 新規性 | 0.15 | 破壊的変更/新機能の検出 |
| 緊急度 | 0.10 | 破壊的変更/セキュリティの検出 |

### 合成スコア

```
compositeScore = trust × 0.30 + usefulness × 0.25 + importance × 0.20 + novelty × 0.15 + urgency × 0.10
```

### 推奨アクション

| スコア範囲 | 推奨 |
|---|---|
| 70以上 | TRY（今すぐ試す） |
| 45-69 | MONITOR（注視） |
| 44以下 | IGNORE（様子見） |

## エラー処理・リトライ

### バックオフ戦略

- **GitHub API**: エクスポネンシャルバックオフ（2^attempt秒）、最大3回リトライ
- **RSS取得**: タイムアウト10秒、失敗時はジョブログに記録
- **HTML取得**: HTTP error時はジョブFAILEDに

### ジョブ管理

- 各ソースごとにJobRunレコードを作成
- ステータス: PENDING → RUNNING → COMPLETED/FAILED
- 失敗時: エラーメッセージをJobRunに記録
- 監査ログ: ジョブ結果をAuditLogに記録

## Cron実行

- **エンドポイント**: `GET /api/cron/daily`
- **スケジュール**: UTC 20:00（JST 05:00）毎日
- **認証**: `CRON_SECRET` 環境変数でBearer認証
- **手動実行**: `POST /api/ingest/manual`

## 将来拡張

- 意味類似度による弱一致（埋め込みベクトル）
- LLM API連携による高品質要約
- リアルタイム更新検知（WebSocket/SSE）
- 収集頻度の動的調整（更新頻度に基づく）
