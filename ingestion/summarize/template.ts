/**
 * テンプレート要約生成（MVP版）
 *
 * MVPでは簡易テンプレートで要約を生成。
 * P1でLLM API連携による高品質要約に移行する。
 */

export interface SummaryInput {
  title: string;
  content?: string;
  sourceType: string;
  sourceName: string;
  url: string;
}

export interface SummaryOutput {
  summary3: string;
  summaryLong: string | null;
  whatChanged: string;
  whoImpacted: string;
  actions: string;
}

/**
 * テンプレートベースの要約生成
 */
export function generateTemplateSummary(input: SummaryInput): SummaryOutput {
  const { title, content, sourceType, sourceName, url } = input;

  // コンテンツのプレビュー（全文転載回避: 最大200文字）
  const contentPreview = content
    ? content.slice(0, 200).replace(/\n/g, " ").trim()
    : "";

  // 3行要約
  const summary3 = [
    `${sourceName}から${title}が発表されました。`,
    contentPreview
      ? `概要: ${contentPreview}${content && content.length > 200 ? "..." : ""}`
      : "詳細は原典をご確認ください。",
    `出典: ${sourceName}`,
  ].join("\n");

  // 詳細要約
  const summaryLong = contentPreview || null;

  // 何が変わったか
  const whatChanged = `${title}`;

  // 誰に影響があるか
  let whoImpacted = "AI関連のプロダクトを利用するユーザー";
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("api") || lowerTitle.includes("sdk")) {
    whoImpacted = "開発者・エンジニア";
  } else if (lowerTitle.includes("pricing") || lowerTitle.includes("料金")) {
    whoImpacted = "利用企業・予算管理者";
  } else if (lowerTitle.includes("security") || lowerTitle.includes("セキュリティ")) {
    whoImpacted = "セキュリティ担当者・管理者";
  }

  // アクション
  const actions = `原典（${url}）を確認し、影響範囲を評価してください。`;

  return {
    summary3,
    summaryLong,
    whatChanged,
    whoImpacted,
    actions,
  };
}
