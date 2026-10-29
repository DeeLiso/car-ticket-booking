// Responsive + i18n audit runner (dev server must be on :5173)
const { chromium } = require("playwright");
const BASE = "http://localhost:5173";
const TRIP = "0a902b274086409ab065928acd6b4981";
const ROUTES = [
  "/",
  "/about",
  "/cookies",
  "/calendar",
  "/booking",
  "/search",
  `/trips/${TRIP}`,
  "/login",
  "/register",
  "/notfound-xyz",
];
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];
const LANGS = ["my", "en"];

const AUDIT = () => {
  const de = document.documentElement;
  const overX = de.scrollWidth - de.clientWidth;
  const overEls = [];
  if (overX > 1) {
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > de.clientWidth + 2) {
        overEls.push(
          el.tagName +
            "." +
            (el.className || "").toString().slice(0, 45) +
            " r=" +
            Math.round(r.right)
        );
      }
    });
  }
  const clipped = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.height < 3000) {
      const cs = getComputedStyle(el);
      if (el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) {
        if (cs.overflowY === "hidden" && el.children.length === 0 && (el.textContent || "").trim().length > 20) {
          clipped.push((el.textContent || "").trim().slice(0, 40));
        }
      }
    }
  });
  const tiny = [];
  document.querySelectorAll("button,a[href],input,select,textarea").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.height < 40) {
      tiny.push(
        Math.round(r.width) +
          "x" +
          Math.round(r.height) +
          ' "' +
          (el.innerText || el.getAttribute("aria-label") || el.placeholder || "").trim().slice(0, 24) +
          '"'
      );
    }
  });
  const raw = (
    document.body.innerText.match(/\b[a-z][a-zA-Z]*\.[a-zA-Z][a-zA-Z]*\b/g) || []
  ).filter((s) => !["tmax", "gmail", "com"].includes(s.split(".")[1]));
  return { overX, overEls, clipped, tiny, raw: [...new Set(raw)], lang: de.lang };
};

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const lang of LANGS) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await page.evaluate((l) => localStorage.setItem("tmax.lang", l), lang);
      for (const route of ROUTES) {
        try {
          await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 15000 });
        } catch (e) {
          await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 15000 });
        }
        await page.waitForTimeout(700);
        const r = await page.evaluate(AUDIT);
        results.push({ route, lang, vp: vp.name, ...r });
      }
      await ctx.close();
    }
  }
  await browser.close();
  let issues = 0;
  for (const r of results) {
    const flags = [];
    if (r.overX > 1) flags.push("OVERFLOW-X " + r.overX);
    if (r.clipped.length) flags.push("CLIPPED " + JSON.stringify(r.clipped.slice(0, 4)));
    if (r.tiny.length) flags.push("TINY " + JSON.stringify(r.tiny.slice(0, 6)));
    if (r.raw.length) flags.push("RAWKEYS " + JSON.stringify(r.raw.slice(0, 6)));
    if (r.overEls.length) flags.push("OVERELS " + JSON.stringify(r.overEls.slice(0, 3)));
    if (flags.length) {
      issues++;
      console.log(`[${r.vp}/${r.lang}] ${r.route}\n   ` + flags.join("\n   "));
    }
  }
  console.log(`\n=== ${results.length} page-checks, ${issues} with issues ===`);
})();
