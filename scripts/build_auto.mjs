/* 构建脚本：从 content/auto.json 生成 js/auto.js */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTO_JSON = path.join(ROOT, "content", "auto.json");
const OUT_JS = path.join(ROOT, "js", "auto.js");

let data = { announcements: [], strategy: [] };
try {
  data = JSON.parse(fs.readFileSync(AUTO_JSON, "utf8"));
} catch (e) {
  console.warn("auto.json 读取失败，使用空数据：" + e.message);
}

const js =
  "/* 自动生成文件，请勿手动编辑。数据源：content/auto.json（由 GitHub Actions 定时更新） */\n" +
  "const AUTO_DATA = " + JSON.stringify(data, null, 2) + ";\n";

fs.writeFileSync(OUT_JS, js, "utf8");
const an = (data.announcements || []).length;
const st = (data.strategy || []).length;
console.log("已生成 js/auto.js：公告 " + an + " 条，攻略速递 " + st + " 条");