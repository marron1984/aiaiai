import { normalizeUrl } from "../../ingestion/normalize/url";

describe("URL正規化", () => {
  it("UTMパラメータを除去する", () => {
    expect(
      normalizeUrl(
        "https://example.com/page?utm_source=twitter&utm_medium=social"
      )
    ).toBe("https://example.com/page");
  });

  it("fbclid, gclidを除去する", () => {
    expect(
      normalizeUrl("https://example.com/page?fbclid=abc123&gclid=xyz")
    ).toBe("https://example.com/page");
  });

  it("httpをhttpsに変換する", () => {
    expect(normalizeUrl("http://example.com/page")).toBe(
      "https://example.com/page"
    );
  });

  it("末尾スラッシュを除去する（ルート以外）", () => {
    expect(normalizeUrl("https://example.com/page/")).toBe(
      "https://example.com/page"
    );
  });

  it("ルートの末尾スラッシュは保持する", () => {
    expect(normalizeUrl("https://example.com/")).toBe(
      "https://example.com/"
    );
  });

  it("フラグメントを除去する", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe(
      "https://example.com/page"
    );
  });

  it("通常のクエリパラメータは保持する", () => {
    expect(normalizeUrl("https://example.com/page?lang=ja")).toBe(
      "https://example.com/page?lang=ja"
    );
  });

  it("不正なURLはそのまま返す", () => {
    expect(normalizeUrl("not-a-url")).toBe("not-a-url");
  });
});
