import {
  normalizeTitle,
  tokenizeTitle,
  jaccardSimilarity,
} from "../../ingestion/normalize/title";

describe("タイトル正規化", () => {
  it("全角英数字を半角に変換する", () => {
    expect(normalizeTitle("ＧＰＴ５リリース")).toBe("GPT5リリース");
  });

  it("全角スペースを半角に変換する", () => {
    expect(normalizeTitle("ChatGPT　アップデート")).toBe(
      "ChatGPT アップデート"
    );
  });

  it("連続空白を圧縮する", () => {
    expect(normalizeTitle("ChatGPT   アップデート")).toBe(
      "ChatGPT アップデート"
    );
  });

  it("前後空白をトリムする", () => {
    expect(normalizeTitle("  ChatGPT  ")).toBe("ChatGPT");
  });
});

describe("タイトルトークン化", () => {
  it("タイトルをトークンに分割する", () => {
    const tokens = tokenizeTitle("ChatGPT アップデート: 新機能追加");
    expect(tokens.has("chatgpt")).toBe(true);
    expect(tokens.has("アップデート")).toBe(true);
    expect(tokens.has("新機能追加")).toBe(true);
  });
});

describe("Jaccard類似度", () => {
  it("同一セットで1.0を返す", () => {
    const a = new Set(["a", "b", "c"]);
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  it("完全に異なるセットで0.0を返す", () => {
    const a = new Set(["a", "b"]);
    const b = new Set(["c", "d"]);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  it("部分一致で0-1の値を返す", () => {
    const a = new Set(["a", "b", "c"]);
    const b = new Set(["b", "c", "d"]);
    // intersection: {b, c} = 2, union: {a, b, c, d} = 4
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });

  it("空セットで0を返す", () => {
    const a = new Set<string>();
    const b = new Set<string>();
    expect(jaccardSimilarity(a, b)).toBe(0);
  });
});
