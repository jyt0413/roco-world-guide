/* ============================================================
   自动更新脚本：抓取公告与攻略速递
   数据源：
   - https://news.17173.com/tag/洛克王国        （GBK，洛克王国资讯）
   - https://roco.qq.com/...新闻公告列表        （GB2312，官方页游公告）
   - https://www.9game.cn/lkwgsy/              （UTF-8，手游攻略列表）
   结果合并到 content/auto.json，并生成 js/auto.js。
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTO_JSON = path.join(ROOT, "content", "auto.json");
const OUT_JS = path.join(ROOT, "js", "auto.js");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const TIMEOUT = 25000;

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

async function fetchText(url, encoding) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9" },
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    return new TextDecoder(encoding).decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- 解析器 ---------- */

// 17173 标签页：<h2 class="tit"><a href="URL">标题</a></h2>，日期在 URL /content/MMDDYYYY/
function parse17173(html) {
  const out = [];
  const re = /<h2 class="tit"><a href="([^"]+)"[^>]*>(.*?)<\/a><\/h2>/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1].trim();
    const title = m[2].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!title || !title.includes("洛克王国")) continue;
    const dm = url.match(/\/content\/(\d{2})(\d{2})(\d{4})\//);
    const date = dm ? dm[3] + "-" + dm[1] + "-" + dm[2] : todayStr();
    const isMobile = title.includes("世界");
    out.push({
      title,
      url,
      publish: date,
      source: "17173 资讯",
      tag: isMobile ? "手游资讯" : "页游资讯",
      auto: true
    });
  }
  return out;
}

// 洛克王国官网（页游）公告列表：<li><a href="...shtml">…标题…</a><span class="fr">2026-07-29</span></li>
function parseRoco(html) {
  const out = [];
  const re = /<a href="([^"]+\.shtml)"[^>]*>(.*?)<\/a>\s*<span class="fr">([^<]*)<\/span>/g;
  let m;
  while ((m = re.exec(html))) {
    let url = m[1].trim();
    if (url.startsWith("/")) url = "https://roco.qq.com" + url;
    const title = m[2].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!title || !title.includes("洛克王国")) continue;
    let date = m[3] ? m[3].trim() : todayStr();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const dm = url.match(/\/(\d{4})(\d{2})\//);
      date = dm ? dm[1] + "-" + dm[2] : todayStr();
      const tm = title.match(/(\d{1,2})月(\d{1,2})日/);
      if (dm && tm) date = dm[1] + "-" + String(Number(tm[1])).padStart(2, "0") + "-" + String(Number(tm[2])).padStart(2, "0");
    }
    out.push({ title, url, publish: date, source: "洛克王国官网（页游频道）", tag: "页游官方公告", auto: true });
  }
  return out;
}

// 9game 手游攻略列表：<a href=".../lkwgsy/数字.html">标题</a>
function parse9game(html) {
  const out = [];
  const re = /<a[^>]*href="[^"]*\/(lkwgsy\/\d+\.html)"[^>]*>([^<]{6,80})<\/a>/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(html))) {
    const url = "https://www.9game.cn/" + m[1];
    const title = m[2].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!title || seen.has(url)) continue;
    if (/下载|安装|电脑版|模拟器|体验服|客服|充值|激活码/.test(title)) continue;
    seen.add(url);
    const category = /阵容|配队|PVP|对战|天梯|PK/.test(title) ? "pvp" : "pve";
    out.push({ title, url, publish: todayStr(), source: "9game 洛克王国手游频道", category, auto: true });
  }
  return out;
}

/* ---------- 合并去重 ---------- */
function normalizeUrl(u) {
  return String(u || "").split("#")[0].replace(/\/+$/, "");
}

function mergeItems(existing, incoming, max, extraSeen) {
  const seen = new Set((existing || []).map((x) => normalizeUrl(x.url)));
  if (extraSeen) extraSeen.forEach((u) => seen.add(normalizeUrl(u)));
  const added = [];
  for (const item of incoming) {
    const key = normalizeUrl(item.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    added.push(item);
  }
  const merged = [...added, ...(existing || [])].sort((a, b) => String(b.publish || "").localeCompare(String(a.publish || "")));
  return merged.slice(0, max);
}

/* ---------- 读取已有数据 ---------- */
function loadAuto() {
  try {
    return JSON.parse(fs.readFileSync(AUTO_JSON, "utf8"));
  } catch (e) {
    return { announcements: [], strategy: [] };
  }
}

/* ---------- 主流程 ---------- */
async function main() {
  const data = loadAuto();
  const results = {};

  // 1) 17173 资讯
  try {
    const html = await fetchText("https://news.17173.com/tag/%E6%B4%9B%E5%85%8B%E7%8E%8B%E5%9B%BD", "gb18030");
    results["17173"] = parse17173(html);
    console.log("17173: 解析到 " + results["17173"].length + " 条");
  } catch (e) {
    console.warn("17173 抓取失败: " + e.message);
    results["17173"] = [];
  }

  // 2) 洛克王国官网（页游）
  try {
    const html = await fetchText(
      "https://roco.qq.com/webplat/info/news_version3/397/11016/11018/m8583/list_1.shtml",
      "gb18030"
    );
    results["roco"] = parseRoco(html);
    console.log("roco.qq.com: 解析到 " + results["roco"].length + " 条");
  } catch (e) {
    console.warn("官网抓取失败: " + e.message);
    results["roco"] = [];
  }

  // 3) 9game 攻略
  try {
    const html = await fetchText("https://www.9game.cn/lkwgsy/", "utf-8");
    results["9game"] = parse9game(html);
    console.log("9game: 解析到 " + results["9game"].length + " 条");
  } catch (e) {
    console.warn("9game 抓取失败: " + e.message);
    results["9game"] = [];
  }

  // 合并公告：17173 + 官网（去重，最多 40 条）
  const curatedNewsUrls = new Set();
  try {
    const dataJs = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
    const fn = new Function(dataJs.replace(/const SITE_DATA\s*=/, "return") + "");
    const site = fn();
    (site.announcements || []).forEach((a) => {
      if (a.url) curatedNewsUrls.add(a.url);
    });
  } catch (e) {
    console.warn("读取 js/data.js 失败（跳过与精选内容去重）: " + e.message);
  }
  const newAnnouncements = mergeItems(
    data.announcements || [],
    [...results["17173"], ...results["roco"]],
    40,
    curatedNewsUrls
  );

  // 合并攻略速递（最多 60 条）
  const newStrategy = mergeItems(data.strategy || [], results["9game"], 60, null);

  const next = { announcements: newAnnouncements, strategy: newStrategy };
  fs.writeFileSync(AUTO_JSON, JSON.stringify(next, null, 2), "utf8");

  // 生成 js/auto.js
  const js =
    "/* 自动生成文件，请勿手动编辑。数据源：content/auto.json（由 GitHub Actions 定时更新） */\n" +
    "const AUTO_DATA = " + JSON.stringify(next, null, 2) + ";\n";
  fs.writeFileSync(OUT_JS, js, "utf8");

  console.log("完成：公告 " + next.announcements.length + " 条（新增 " +
    (next.announcements.length - (data.announcements || []).length) + "），攻略速递 " +
    next.strategy.length + " 条（新增 " + (next.strategy.length - (data.strategy || []).length) + "）");
}

main().catch((e) => {
  console.error("自动更新失败: " + e.message);
  process.exit(1);
});