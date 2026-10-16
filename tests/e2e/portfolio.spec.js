import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("mobile theme works with legacy Safari media listeners and blocked storage", async ({browser}) => {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    await context.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = query => { const media = original(query); media.addEventListener = undefined; return media; };
      Object.defineProperty(window, "localStorage", {get() {throw new Error("Storage unavailable");}});
    });
    const page = await context.newPage();
    await page.goto("/");
    const theme = page.locator("#theme-toggle");
    await theme.tap();
    await expect(page.locator("body")).toHaveClass(/light-mode/);
    await expect(theme).toHaveAttribute("aria-pressed", "true");
    await theme.tap();
    await expect(page.locator("body")).not.toHaveClass(/light-mode/);
    const themeBox = await theme.boundingBox();
    const menuBox = await page.locator("#menu-toggle").boundingBox();
    expect(Math.abs(themeBox.y - menuBox.y)).toBeLessThan(1);
  } finally { await context.close(); }
});
test("portfolio survives corrupt saved projects, filters and keyboard dialog work", async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("saved-projects", "{"));
  await page.goto("/");
  await expect(page.locator(".project-card")).toHaveCount(6);
  await page.locator("#project-search").fill("Next.js");
  await expect(page.locator(".project-card:not(.is-hidden)")).toHaveCount(1);
  await page.locator('[data-project="blog"]').press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator("#modal-close").press("Shift+Tab");
  await expect(page.locator("#modal-case-link")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-project="blog"]')).toBeFocused();
});
test("tasks persist and can be completed", async ({page}) => {
  await page.goto("/");
  await page.locator(".playground-form input").fill("Ստուգել կայքը");
  await page.locator(".playground-add").click();
  await page.reload();
  await expect(page.locator(".playground-list li")).toHaveCount(1);
  await page.locator('.playground-list input[type="checkbox"]').check();
  await expect(page.locator(".playground-summary")).toContainText("1 / 1");
});
for (const width of [360, 768, 1440]) {
  test(`pages fit a ${width}px viewport`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    for (const path of ["/", "/shop.html", "/dashboard.html", "/weather.html", "/music.html", "/next-blog/", "/react-planner/", "/cv.html", "/case-study.html?project=blog"]) {
      await page.route(url => url.protocol === "https:", route => route.abort());
      await page.goto(path);
      const layout = await page.evaluate(() => ({fits:document.documentElement.scrollWidth <= innerWidth + 1, overflow:[...document.querySelectorAll("body *")].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== "fixed").slice(0,8).map(el => ({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width}))}));
      expect(layout.fits, `${path}: ${JSON.stringify(layout.overflow)}`).toBe(true);
    }
  });
}
test("blog article links work and its accessibility audit passes", async ({page}) => {
  await page.goto("/next-blog/");
  await page.getByRole("link", {name:"Առաջին քայլերը Next.js-ում"}).click();
  await expect(page.locator("h1")).toHaveText("Առաջին քայլերը Next.js-ում");
  const result = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze();
  expect(result.violations).toEqual([]);
});
test("blog search combines with categories and handles empty results", async ({page}) => {
  await page.goto("/next-blog/");
  await page.locator("#article-search").fill("React");
  await expect(page.locator(".card")).toHaveCount(1);
  await page.getByRole("button", {name:"Next.js",exact:true}).click();
  await expect(page.locator(".card")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("0 հոդված");
});
test("shop recovers from tampered cart and returns focus on closing", async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("armineShopCart", JSON.stringify([{id:1,quantity:2,price:0,name:"<script>bad</script>"}])));
  await page.goto("/shop.html");
  await expect(page.locator("#cart-count")).toHaveText("2");
  await page.locator("#cart-button").click();
  await expect(page.locator("#cart-total")).toHaveText("178.00");
  await expect(page.locator("#close-cart")).toBeFocused();
  await page.locator("#close-cart").click();
  await expect(page.locator("#cart-button")).toBeFocused();
});
test("contact form reports network errors and restores its submit button", async ({page}) => {
  await page.route("https://formspree.io/**", route => route.abort());
  await page.goto("/");
  await page.locator("#name").fill("Test");
  await page.locator("#email").fill("test@example.com");
  await page.locator("#message-input").fill("Test message");
  await page.locator("#contact-submit").click();
  await expect(page.locator("#message")).toHaveClass("error");
  await expect(page.locator("#contact-submit")).toBeEnabled();
  await expect(page.locator("#contact-form")).toHaveAttribute("aria-busy", "false");
});
test("weather network failure displays an error without fake readings", async ({page}) => {
  let blockedRequests = 0;
  await page.route(url => url.hostname.endsWith(".open-meteo.com"), route => {
    blockedRequests += 1;
    return route.abort("failed");
  });
  await page.goto("/weather.html");
  await expect(page.locator("#weather-status")).toContainText("Could not connect");
  await expect(page.locator(".weather-info")).toBeHidden();
  await expect(page.locator(".weather-card")).toHaveAttribute("aria-busy", "false");
  expect(blockedRequests).toBeGreaterThan(0);
});
test("project accessibility checks", async ({page}) => {
  await page.route(url => url.protocol === "https:", route => route.abort());
  for (const path of ["/", "/shop.html", "/dashboard.html", "/weather.html", "/music.html", "/react-planner/", "/cv.html", "/case-study.html?project=blog"]) {
    await page.goto(path);
    const result = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze();
    expect.soft(result.violations.map(item => ({id:item.id,nodes:item.nodes.map(node => node.target)})),path).toEqual([]);
  }
});
