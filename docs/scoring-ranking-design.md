# スコアリング・ランキング設計 — aiaiai

## 概要

aiaiaiでは、収集した情報を「読む価値順」に提示するため、多軸スコアリングとランキングアルゴリズムを採用する。スコアは自動算出され、管理者が確認・調整可能とする。将来的にはユーザー行動データによるフィードバックループも導入する。

---

## 1. スコア次元（Score Dimensions）

5つの次元でスコアを算出し、加重平均で総合スコアを計算する。

| 次元 | フィールド名 | 重み | 範囲 | 説明 |
|---|---|---|---|---|
| **信頼度** | `scoreTrust` | 0.30 | 0.0〜1.0 | 情報源の信頼性 |
| **有用性** | `scoreUsefulness` | 0.25 | 0.0〜1.0 | 実務者にとっての実用価値 |
| **重要度** | `scoreImportance` | 0.20 | 0.0〜1.0 | 変更の影響範囲・深刻度 |
| **新規性** | `scoreNovelty` | 0.15 | 0.0〜1.0 | 情報の新しさ・初出性 |
| **緊急性** | `scoreUrgency` | 0.10 | 0.0〜1.0 | 即時対応の必要性 |

---

## 2. 各次元の算出ロジック

### 2.1 信頼度（Trust）— 重み 0.30

情報源の種別・信頼スコアに基づき算出する。ソースのヒエラルキーを反映する。

| 要素 | 算出方法 | 重み（次元内） |
|---|---|---|
| ソース種別 | official=1.0, github=0.9, rss=0.7, x=0.4 | 0.50 |
| ソース信頼スコア | Source.trustScore（0.0〜1.0、管理者設定） | 0.30 |
| 裏取り状態 | verified=1.0, unverified=0.3, retracted=0.0 | 0.20 |

```
scoreTrust = sourceTypeFactor × 0.50
           + sourceTrustScore × 0.30
           + verificationFactor × 0.20
```

### 2.2 有用性（Usefulness）— 重み 0.25

読者にとっての実務的価値を評価する。

| 要素 | 算出方法 | 重み（次元内） |
|---|---|---|
| アクション有無 | actionsフィールドに具体的行動が含まれるか | 0.40 |
| 影響範囲 | whoImpacted の対象層の広さ（全ユーザー=1.0, 特定プラン=0.6, ニッチ=0.3） | 0.35 |
| 変更種別 | 新機能=0.9, 改善=0.7, バグ修正=0.5, ドキュメント更新=0.3 | 0.25 |

```
scoreUsefulness = actionFactor × 0.40
                + impactScopeFactor × 0.35
                + changeTypeFactor × 0.25
```

### 2.3 重要度（Importance）— 重み 0.20

変更の影響範囲と深刻度を評価する。

| 要素 | 算出方法 | 重み（次元内） |
|---|---|---|
| 破壊的変更 | breaking change=1.0, 非破壊=0.3 | 0.40 |
| 影響プロダクト数 | TopicCluster内のプロダクト数に応じて正規化 | 0.30 |
| 料金/規約変更 | 料金改定・利用規約変更を含む=1.0, 含まない=0.0 | 0.30 |

```
scoreImportance = breakingChangeFactor × 0.40
                + productCountFactor × 0.30
                + pricingTermsFactor × 0.30
```

### 2.4 新規性（Novelty）— 重み 0.15

情報の鮮度と初出性を評価する。時間減衰関数を適用する。

| 要素 | 算出方法 | 重み（次元内） |
|---|---|---|
| 公開からの経過時間 | 指数減衰: `exp(-λt)` （λ=0.1、tは経過日数） | 0.60 |
| 初出かどうか | 類似記事が過去に存在しない=1.0, 続報=0.5, 再報=0.2 | 0.40 |

```
scoreNovelty = timeFreshness × 0.60
             + originalityFactor × 0.40

// timeFreshness = exp(-0.1 × daysSincePublished)
// daysSincePublished=0 → 1.0
// daysSincePublished=3 → 0.74
// daysSincePublished=7 → 0.50
// daysSincePublished=14 → 0.25
// daysSincePublished=30 → 0.05
```

### 2.5 緊急性（Urgency）— 重み 0.10

即時対応が必要かどうかを評価する。

| 要素 | 算出方法 | 重み（次元内） |
|---|---|---|
| 非推奨/廃止予告 | deprecation/EOL日が30日以内=1.0, 90日以内=0.6, なし=0.0 | 0.50 |
| セキュリティ関連 | セキュリティ修正=1.0, それ以外=0.0 | 0.30 |
| 期限付きアクション | マイグレーション期限等あり=1.0, なし=0.0 | 0.20 |

```
scoreUrgency = deprecationFactor × 0.50
             + securityFactor × 0.30
             + deadlineFactor × 0.20
```

---

## 3. 総合スコア算出式

### 3.1 加重平均

```
totalScore = scoreTrust      × 0.30
           + scoreUsefulness × 0.25
           + scoreImportance × 0.20
           + scoreNovelty    × 0.15
           + scoreUrgency    × 0.10
```

### 3.2 スコアの保存

各次元のスコアと総合スコアはArticleテーブルに保存する。

```prisma
model Article {
  scoreTrust      Float @default(0)
  scoreUsefulness Float @default(0)
  scoreImportance Float @default(0)
  scoreNovelty    Float @default(0)
  scoreUrgency    Float @default(0)
  totalScore      Float @default(0)  // 加重平均
}
```

### 3.3 再計算タイミング

| トリガー | 再計算対象 |
|---|---|
| 記事生成時 | 当該記事のみ |
| 日次Cron | 全published記事（新規性の時間減衰を反映） |
| ソース信頼スコア変更時 | 当該ソース由来の全記事 |
| 管理者による手動調整 | 当該記事のみ |

---

## 4. ランキングアルゴリズム

### 4.1 デフォルトランキング（トップページ・最新一覧）

トップページおよび最新一覧では、以下の順序で記事を表示する。

```
ORDER BY totalScore DESC, publishedAt DESC
```

- 同一スコアの場合は公開日時が新しい順
- 未検証（unverified）記事は通常記事の下位に配置

### 4.2 プロダクト別ページ

```
WHERE product = :product
ORDER BY publishedAt DESC
```

- プロダクト別ページでは時系列順をデフォルトとする（フィルターで「スコア順」切替可能）

### 4.3 週次ダイジェスト

```
WHERE publishedAt >= :weekStart AND publishedAt < :weekEnd
ORDER BY totalScore DESC
LIMIT 20
```

- 上位3件を「今週のハイライト」として特別表示

### 4.4 検索結果

```
// PostgreSQL FTSスコアとtotalScoreのブレンド
relevanceScore = ftsScore × 0.60 + totalScore × 0.40
ORDER BY relevanceScore DESC
```

---

## 5. アクション判定ラベルとの連動

totalScoreに基づき、記事にアクション判定ラベルを自動付与する。

| ラベル | 条件 | 説明 |
|---|---|---|
| **Try** | `totalScore >= 0.70` かつ `scoreUsefulness >= 0.60` | すぐに試す価値がある |
| **Monitor** | `totalScore >= 0.40` または `scoreUrgency >= 0.50` | 動向を注視すべき |
| **Ignore** | 上記以外 | 大多数に影響なし |

ラベルは自動付与後、管理者が `/admin/articles` で手動修正可能。

---

## 6. スコア調整と管理者オーバーライド

### 6.1 管理者によるスコア調整

管理画面から以下の操作が可能。

| 操作 | 内容 |
|---|---|
| 個別スコア調整 | 各次元のスコアを手動で上書き |
| ラベル変更 | Try / Monitor / Ignore を手動で変更 |
| ピン留め | 特定記事をトップに固定表示（期間指定可能） |
| 非表示 | スコアに関係なく一覧から非表示にする |

### 6.2 調整の監査

スコアの手動調整はすべてAuditLogに記録する。

```
AuditLog {
  actor: "admin@example.com"
  action: "score_override"
  target: "article:chatgpt-2026-02-27-web-search"
  diff: { scoreTrust: { old: 0.8, new: 0.95 }, reason: "公式発表を確認" }
}
```

---

## 7. 将来の改善: ユーザー行動フィードバック

### 7.1 収集するメトリクス（P1以降）

| メトリクス | 説明 | 取得方法 |
|---|---|---|
| クリック率（CTR） | 一覧からの記事クリック率 | フロントエンドイベント |
| 保存数 | ユーザーが「保存」した回数 | 会員機能（P2） |
| 滞在時間（Dwell Time） | 記事ページの滞在時間 | フロントエンドイベント |
| 直帰率 | 記事を開いてすぐ離脱した割合 | アナリティクス |

### 7.2 フィードバックループ

```
[ユーザー行動] → [メトリクス集計] → [スコア補正] → [ランキング更新]
```

#### 補正式（将来導入予定）

```
adjustedScore = totalScore × (1 + engagementBoost)

engagementBoost = ctrFactor × 0.30
                + saveFactor × 0.30
                + dwellFactor × 0.25
                + (1 - bounceFactor) × 0.15
```

- 各Factorは全記事の分布に対する相対値（パーセンタイル正規化）
- engagementBoostは -0.2〜+0.3 の範囲にクランプする
- コールドスタート問題: 公開後48時間はengagementBoostを0とする

### 7.3 導入ロードマップ

| フェーズ | 内容 |
|---|---|
| MVP | 5軸スコアリングのみ（本設計の範囲） |
| P1 | クリック率・滞在時間の収集開始、ダッシュボード表示 |
| P2 | 保存数の収集（会員機能と連動）、フィードバックループ導入 |
| P3 | A/Bテスト基盤、重み自動最適化 |

---

## 8. 実装上の注意事項

### 8.1 パフォーマンス

- totalScoreにDBインデックスを設定し、ランキングクエリを高速化する
- 日次再計算はバッチ処理で実行し、1記事ずつの更新は避ける
- 新規性の時間減衰は日次Cronで一括更新する（リアルタイム計算は行わない）

### 8.2 テスト

- 各次元のスコア算出ロジックのユニットテストを必須とする
- 境界値テスト: 0.0, 0.5, 1.0 の各値でラベル判定が正しいことを検証
- 時間減衰テスト: 経過日数0, 3, 7, 14, 30での減衰値を検証
- ランキング順序テスト: 同一スコア時のタイブレーク（publishedAt）を検証

### 8.3 透明性

- 記事詳細ページの管理者ビューにスコア内訳を表示する
- スコアリングの基準はユーザー向けヘルプページで簡潔に説明する（将来）
