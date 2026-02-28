import { scoreArticle } from "../../ingestion/score/scoring";
import { calculateCompositeScore, getScoreRank } from "../../src/lib/score";

describe("スコアリング", () => {
  it("公式ソースは高い信頼スコアを返す", () => {
    const result = scoreArticle({
      sourceType: "OFFICIAL",
      title: "New Feature",
    });
    expect(result.trustScore).toBe(100);
  });

  it("Xソースは低い信頼スコアを返す", () => {
    const result = scoreArticle({
      sourceType: "X",
      title: "New Feature",
    });
    expect(result.trustScore).toBe(25);
  });

  it("破壊的変更は高い緊急度を返す", () => {
    const result = scoreArticle({
      sourceType: "OFFICIAL",
      title: "Breaking Change",
      isBreakingChange: true,
    });
    expect(result.urgencyScore).toBeGreaterThanOrEqual(70);
  });

  it("料金変更は高い重要度を返す", () => {
    const result = scoreArticle({
      sourceType: "OFFICIAL",
      title: "Pricing Update",
      isPricingChange: true,
    });
    expect(result.importanceScore).toBeGreaterThanOrEqual(70);
  });

  it("セキュリティ関連は緊急度と重要度が高い", () => {
    const result = scoreArticle({
      sourceType: "OFFICIAL",
      title: "Security Fix",
      isSecurityRelated: true,
    });
    expect(result.urgencyScore).toBeGreaterThanOrEqual(60);
    expect(result.importanceScore).toBeGreaterThanOrEqual(65);
  });

  it("高スコアならTRYを推奨する", () => {
    const result = scoreArticle({
      sourceType: "OFFICIAL",
      title: "Critical Security Breaking Change",
      isBreakingChange: true,
      isSecurityRelated: true,
    });
    expect(result.recommendation).toBe("TRY");
  });

  it("合成スコアが0-100の範囲に収まる", () => {
    const result = scoreArticle({
      sourceType: "X",
      title: "minor update",
    });
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
  });
});

describe("合成スコア計算", () => {
  it("全て100の場合100を返す", () => {
    const score = calculateCompositeScore({
      trustScore: 100,
      usefulnessScore: 100,
      importanceScore: 100,
      noveltyScore: 100,
      urgencyScore: 100,
    });
    expect(score).toBe(100);
  });

  it("全て0の場合0を返す", () => {
    const score = calculateCompositeScore({
      trustScore: 0,
      usefulnessScore: 0,
      importanceScore: 0,
      noveltyScore: 0,
      urgencyScore: 0,
    });
    expect(score).toBe(0);
  });

  it("重み付けが正しく反映される", () => {
    // trust=100, others=0 → 100 * 0.20 = 20
    const score = calculateCompositeScore({
      trustScore: 100,
      usefulnessScore: 0,
      importanceScore: 0,
      noveltyScore: 0,
      urgencyScore: 0,
    });
    expect(score).toBe(20);
  });
});

describe("スコアランク", () => {
  it("80以上はS", () => expect(getScoreRank(80)).toBe("S"));
  it("65はA", () => expect(getScoreRank(65)).toBe("A"));
  it("50はB", () => expect(getScoreRank(50)).toBe("B"));
  it("35はC", () => expect(getScoreRank(35)).toBe("C"));
  it("20はD", () => expect(getScoreRank(20)).toBe("D"));
});
