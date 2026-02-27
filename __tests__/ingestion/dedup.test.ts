import { deduplicateItems, DedupeCandidate } from "../../ingestion/dedupe/dedup";

describe("重複判定", () => {
  it("同一URLのアイテムを統合する（強一致）", () => {
    const items: DedupeCandidate[] = [
      { id: "1", canonicalUrl: "https://example.com/page", title: "Page Title", sourceType: "OFFICIAL" },
      { id: "2", canonicalUrl: "https://example.com/page", title: "Page Title Copy", sourceType: "RSS" },
    ];

    const result = deduplicateItems(items);
    expect(result.clusters.length).toBe(1);
    expect(result.unique.length).toBe(0);
    // 公式が代表
    expect(result.clusters[0][0].sourceType).toBe("OFFICIAL");
  });

  it("類似タイトルのアイテムを統合する（中一致）", () => {
    const items: DedupeCandidate[] = [
      { id: "1", canonicalUrl: "https://a.com/1", title: "ChatGPT アップデート 新機能", sourceType: "OFFICIAL" },
      { id: "2", canonicalUrl: "https://b.com/2", title: "ChatGPT アップデート 新機能 追加", sourceType: "RSS" },
    ];

    const result = deduplicateItems(items);
    expect(result.clusters.length).toBe(1);
  });

  it("異なるアイテムはユニークのまま保持する", () => {
    const items: DedupeCandidate[] = [
      { id: "1", canonicalUrl: "https://a.com/1", title: "ChatGPT Memory Update", sourceType: "OFFICIAL" },
      { id: "2", canonicalUrl: "https://b.com/2", title: "Gemini 2.0 Flash Release", sourceType: "OFFICIAL" },
    ];

    const result = deduplicateItems(items);
    expect(result.clusters.length).toBe(0);
    expect(result.unique.length).toBe(2);
  });

  it("代表記事は公式 > RSS > GitHub > X の順で選ばれる", () => {
    const items: DedupeCandidate[] = [
      { id: "1", canonicalUrl: "https://example.com/same", title: "Same", sourceType: "X" },
      { id: "2", canonicalUrl: "https://example.com/same", title: "Same", sourceType: "OFFICIAL" },
      { id: "3", canonicalUrl: "https://example.com/same", title: "Same", sourceType: "RSS" },
    ];

    const result = deduplicateItems(items);
    expect(result.clusters[0][0].sourceType).toBe("OFFICIAL");
  });

  it("空のアイテムリストを処理できる", () => {
    const result = deduplicateItems([]);
    expect(result.clusters.length).toBe(0);
    expect(result.unique.length).toBe(0);
  });
});
