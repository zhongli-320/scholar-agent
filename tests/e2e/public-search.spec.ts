import { expect, test } from "@playwright/test";

test("homepage exposes the approved navigation and starts a basic search", async ({ page }) => {
  await page.route("**/api/suggestions**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ terms: [], queries: [] }) });
  });
  await page.route("**/api/search", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        works: [], total: 0, nextCursor: null, aiPlan: null, aiFallback: false,
        aiError: null, aiProvider: null, aiModel: null, remainingAiUses: null, historySaved: false,
      }),
    });
  });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "把研究问题变成可信的文献线索" })).toBeVisible();
  await expect(page.getByRole("link", { name: "智能检索" })).toBeVisible();
  await expect(page.getByRole("link", { name: "项目空间" })).toBeVisible();
  await expect(page.getByRole("link", { name: "检索历史" })).toBeVisible();

  const login = await page.getByRole("link", { name: "登录 / 注册" }).boundingBox();
  const history = await page.getByRole("link", { name: "检索历史" }).boundingBox();
  expect(login?.x).toBeGreaterThan(history?.x ?? 0);

  await page.getByLabel("研究问题或关键词").fill("生成式人工智能");
  await page.getByRole("button", { name: "普通检索" }).click();
  await expect(page).toHaveURL(/\/search\?q=.*&mode=basic/);
});

test("typing shows suggestions and selecting one only fills the search box", async ({ page }) => {
  await page.route("**/api/suggestions**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        terms: ["教育技术"],
        queries: ["生成式人工智能与教育技术的关系"],
      }),
    });
  });
  await page.goto("/");

  const input = page.getByLabel("研究问题或关键词");
  await input.fill("生成式");
  await expect(page.getByRole("option", { name: "生成式人工智能与教育技术的关系" })).toBeVisible();
  await page.getByRole("option", { name: "生成式人工智能与教育技术的关系" }).click();

  await expect(input).toHaveValue("生成式人工智能与教育技术的关系");
  await expect(page).toHaveURL(/\/$/);
});

test("results use the approved three-column content and automatic history message", async ({ page }) => {
  await page.route("**/api/suggestions**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        terms: ["教育技术", "信息行为"],
        queries: ["生成式人工智能与教育技术的关系"],
      }),
    });
  });
  await page.route("**/api/search", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        works: [
          {
            id: "W123",
            openAlexUrl: "https://openalex.org/W123",
            doi: "10.1000/example",
            title: "生成式人工智能与信息行为",
            publicationYear: 2025,
            publicationDate: "2025-03-08",
            type: "article",
            language: "zh",
            citedByCount: 12,
            abstract: "中文 摘要",
            authors: ["张三", "李四"],
            institutions: ["中山大学"],
            source: "情报学报",
            landingPageUrl: "https://example.com",
            pdfUrl: null,
            isOpenAccess: true,
            openAccessStatus: "green",
            openAccessUrl: "https://example.com",
            primaryTopic: "Information Behavior",
          },
        ],
        total: 128,
        nextCursor: null,
        aiPlan: null,
        aiFallback: false,
        remainingAiUses: null,
        historySaved: true,
      }),
    });
  });

  await page.goto("/search?q=生成式人工智能&mode=basic");

  await expect(page.getByRole("region", { name: "检索筛选" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "生成式人工智能与信息行为" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "智能检索说明" })).toContainText("找到 128 条结果");
  await expect(page.getByRole("complementary", { name: "智能检索说明" })).toContainText("已自动加入检索历史");
  await expect(page.getByRole("complementary", { name: "智能检索说明" })).toContainText("教育技术");
  await expect(page.getByRole("complementary", { name: "智能检索说明" })).toContainText("生成式人工智能与教育技术的关系");
  await expect(page.getByRole("button", { name: "保存本次检索" })).toHaveCount(0);
});

test("mobile homepage does not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

test("AI fallback reports the reason in a delayed toast", async ({ page }) => {
  await page.route("**/api/suggestions**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ terms: [], queries: [] }) });
  });
  await page.route("**/api/search", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        works: [],
        total: 0,
        nextCursor: null,
        aiPlan: null,
        aiFallback: true,
        aiError: "智能解析鉴权失败，请联系管理员检查 GLM API 密钥",
        remainingAiUses: 2,
        historySaved: true,
      }),
    });
  });

  await page.goto("/search?q=生成式人工智能&mode=ai");

  const toast = page.getByRole("alert").filter({ hasText: "本次未计入今日额度" });
  await expect(toast).toContainText("本次未计入今日额度");
  await expect(toast).toContainText("GLM API 密钥");
});
