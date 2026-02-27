# SEO戦略 — aiaiai

## 概要

aiaiaiのSEO戦略は、AI関連アップデート情報の日本語検索において「最も正確で構造化された情報源」としてのポジションを確立することを目標とする。技術的SEO基盤を整備し、高品質なコンテンツと正しい構造化データによりオーガニック流入を獲得する。

---

## 1. robots.txt

### 1.1 基本方針

- `robots.txt` はクローラーのクロール制御に使用する
- インデックス除外には `robots.txt` ではなく、`noindex` メタタグまたは `X-Robots-Tag` ヘッダーを使用する
- 管理画面・API・内部パスはクロール対象外とする

### 1.2 設定内容

```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/

Sitemap: https://aiaiai.example.com/sitemap.xml
```

### 1.3 注意事項

| 項目 | 対応 |
|---|---|
| クロール対象外のページ | `/admin/*`, `/api/*`, `/_next/*` |
| インデックス除外が必要なページ | `noindex` メタタグで制御（検索結果の下書きプレビュー等） |
| 外部サイトのrobots.txt | 収集パイプラインで必ず尊重する（法務ルール） |

---

## 2. sitemap.xml

### 2.1 基本方針

- sitemap.xmlはAPIエンドポイント（`/api/sitemap/route.ts`）で動的に自動生成する
- `robots.txt` にsitemapのURLを記載する
- `published` ステータスの記事のみをsitemapに含める

### 2.2 対象ページ

| ページ種別 | URLパターン | 更新頻度 | 優先度 |
|---|---|---|---|
| トップ | `/` | daily | 1.0 |
| 最新一覧 | `/latest` | daily | 0.9 |
| 記事詳細 | `/article/[slug]` | weekly | 0.8 |
| プロダクト別 | `/products/[slug]` | daily | 0.7 |
| トピック別 | `/topics/[slug]` | weekly | 0.6 |
| 比較記事 | `/compare` | weekly | 0.6 |
| 週次ダイジェスト | `/weekly` | weekly | 0.7 |
| 検索 | `/search` | — | 除外 |

### 2.3 実装仕様

```typescript
// /api/sitemap/route.ts
// - DBからpublished記事一覧を取得
// - lastmod は Article.updatedAt を使用
// - XML形式で出力（Content-Type: application/xml）
// - 1ファイルあたり最大50,000 URLを上限とし、超過時はsitemap indexを使用
```

---

## 3. canonical（正規URL）

### 3.1 基本方針

- すべてのページに `<link rel="canonical">` を設定する
- TopicCluster内で複数のRawItemが存在する場合、代表記事のURLを正規URLとする
- クエリパラメータ付きURL（`?page=2`, `?sort=date`）は正規URLからパラメータを除外する

### 3.2 実装ルール

| ケース | canonical設定 |
|---|---|
| 通常記事 | 自身のURL（`/article/[slug]`） |
| ページネーション | 1ページ目のURL |
| フィルター/ソート付き | パラメータなしのベースURL |
| AMP版（将来） | 通常版のURL |

### 3.3 実装例

```tsx
// app/(public)/article/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const article = await getArticle(params.slug);
  return {
    alternates: {
      canonical: `https://aiaiai.example.com/article/${article.slug}`,
    },
  };
}
```

---

## 4. OGP / Twitter Card

### 4.1 基本方針

- すべての公開ページにOpen Graph Protocol（OGP）メタタグを設定する
- Twitter Card（summary_large_image）を併用する
- SNSシェア時に適切なプレビューが表示されることを保証する

### 4.2 メタタグ仕様

#### 共通設定

```html
<meta property="og:site_name" content="aiaiai" />
<meta property="og:locale" content="ja_JP" />
<meta name="twitter:site" content="@aiaiai_jp" />
```

#### 記事ページ

| プロパティ | 値 |
|---|---|
| `og:type` | `article` |
| `og:title` | 記事タイトル（60文字以内） |
| `og:description` | 3行要約（summary3）の1行目（120文字以内） |
| `og:url` | canonical URL |
| `og:image` | OGP画像（動的生成 or デフォルト） |
| `og:article:published_time` | 公開日時（ISO 8601） |
| `og:article:modified_time` | 更新日時（ISO 8601） |
| `og:article:section` | プロダクト名（例: ChatGPT） |
| `og:article:tag` | タグ一覧 |
| `twitter:card` | `summary_large_image` |
| `twitter:title` | og:titleと同一 |
| `twitter:description` | og:descriptionと同一 |

#### 一覧ページ・トップ

| プロパティ | 値 |
|---|---|
| `og:type` | `website` |
| `og:title` | ページタイトル |
| `og:description` | サイト説明文 |

### 4.3 OGP画像

- デフォルトOGP画像: サイトロゴ + サイト名（1200x630px）
- 記事ページ: プロダクトロゴ + 記事タイトルを動的生成（Next.js `ImageResponse` API活用）
- 画像フォーマット: PNG、1200x630px

---

## 5. Article JSON-LD 構造化データ

### 5.1 基本方針

- 記事ページに `Article` タイプのJSON-LDを埋め込む
- Googleリッチリザルト（ニュース記事）への対応を目指す
- Schema.org仕様に準拠する

### 5.2 JSON-LD スキーマ

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "ChatGPT にリアルタイムウェブ検索が標準搭載",
  "description": "ChatGPT Plusユーザー向けにリアルタイムウェブ検索機能が標準搭載された。プラグイン不要で最新情報にアクセス可能に。",
  "datePublished": "2026-02-27T09:00:00+09:00",
  "dateModified": "2026-02-27T12:00:00+09:00",
  "author": {
    "@type": "Organization",
    "name": "aiaiai",
    "url": "https://aiaiai.example.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "aiaiai",
    "logo": {
      "@type": "ImageObject",
      "url": "https://aiaiai.example.com/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://aiaiai.example.com/article/chatgpt-web-search"
  },
  "image": "https://aiaiai.example.com/og/chatgpt-web-search.png",
  "articleSection": "ChatGPT",
  "keywords": ["ChatGPT", "ウェブ検索", "Plus", "アップデート"],
  "inLanguage": "ja"
}
```

### 5.3 追加の構造化データ

#### WebSite（トップページ）

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "aiaiai",
  "url": "https://aiaiai.example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://aiaiai.example.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

#### BreadcrumbList（パンくずリスト）

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "ホーム", "item": "https://aiaiai.example.com" },
    { "@type": "ListItem", "position": 2, "name": "ChatGPT", "item": "https://aiaiai.example.com/products/chatgpt" },
    { "@type": "ListItem", "position": 3, "name": "記事タイトル" }
  ]
}
```

---

## 6. URL設計

### 6.1 基本原則

- 人間が読めるスラッグ（slug）を使用する
- URLは英数字・ハイフンのみで構成する（日本語URLは避ける）
- 階層構造はIA（情報アーキテクチャ）と一致させる
- URLは永続的に維持する（変更時は301リダイレクト）

### 6.2 URLパターン

| ページ | URL | 例 |
|---|---|---|
| トップ | `/` | — |
| 最新一覧 | `/latest` | — |
| 記事詳細 | `/article/{slug}` | `/article/chatgpt-2026-02-27-web-search` |
| プロダクト別 | `/products/{product-slug}` | `/products/chatgpt` |
| トピック別 | `/topics/{topic-slug}` | `/topics/context-window` |
| 比較 | `/compare` | — |
| 週次ダイジェスト | `/weekly/{year}-w{week}` | `/weekly/2026-w09` |
| 検索 | `/search?q={query}` | `/search?q=API変更` |

### 6.3 スラッグ生成ルール

記事スラッグは以下のフォーマットで自動生成する。

```
{product-slug}-{date}-{topic-keyword}
```

- `product-slug`: プロダクトの英語略称（chatgpt, claude, gemini 等）
- `date`: 公開日（YYYY-MM-DD形式）
- `topic-keyword`: 変更内容を表す英語キーワード（2〜4語、ハイフン区切り）

**例:**
- `chatgpt-2026-02-27-web-search-standard`
- `claude-2026-02-25-api-rate-limit-update`
- `gemini-2026-02-20-context-window-expansion`

### 6.4 リダイレクトポリシー

- スラッグ変更時は旧URLから新URLへ301リダイレクトを設定する
- リダイレクトマッピングは `vercel.json` の `redirects` または DB管理で実装する
- リダイレクトチェーンは最大1段階とする（A→B→Cは禁止、A→Cに直接設定）

---

## 7. メタタグ実装チェックリスト

### 全ページ共通

- [ ] `<title>` が設定されている（60文字以内）
- [ ] `<meta name="description">` が設定されている（120文字以内）
- [ ] `<link rel="canonical">` が正しいURLを指している
- [ ] OGPメタタグ（og:title, og:description, og:image, og:url）が設定されている
- [ ] Twitter Cardメタタグが設定されている
- [ ] `<html lang="ja">` が設定されている
- [ ] viewport メタタグが設定されている

### 記事ページ追加

- [ ] Article JSON-LDが埋め込まれている
- [ ] BreadcrumbList JSON-LDが埋め込まれている
- [ ] `og:type` が `article` に設定されている
- [ ] `og:article:published_time` / `modified_time` が設定されている

### トップページ追加

- [ ] WebSite JSON-LD（SearchAction含む）が埋め込まれている

---

## 8. パフォーマンスとSEO

### Core Web Vitals 目標

| 指標 | 目標値 | 対策 |
|---|---|---|
| LCP（Largest Contentful Paint） | < 2.5s | SSR/ISR活用、画像最適化 |
| FID（First Input Delay） | < 100ms | JS最小化、コード分割 |
| CLS（Cumulative Layout Shift） | < 0.1 | 画像サイズ指定、フォント最適化 |

### 技術的対策

- Next.js App RouterのSSR/ISRを活用し、記事ページは静的生成 + 再検証（revalidate）
- 画像は `next/image` で自動最適化（WebP変換、サイズ適応）
- フォントは `next/font` でセルフホスティング（CLS防止）
- CSSはTailwind CSSのPurge機能で未使用スタイルを除去
