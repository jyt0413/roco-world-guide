/* ============================================================
   洛克王国：世界 · 小洛克攻略站 主脚本
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- 工具 ---------- */
  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function fmtDate(iso) {
    if (!iso) return "长期";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const mm = d.getMonth() + 1, dd = d.getDate();
    const hh = String(d.getHours()).padStart(2, "0"), mi = String(d.getMinutes()).padStart(2, "0");
    return mm + "月" + dd + "日 " + hh + ":" + mi;
  }

  function fmtDateShort(iso) {
    if (!iso) return "长期";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  /* ---------- 顶部导航 ---------- */
  const nav = $("#top-nav");
  const navToggle = $("#nav-toggle");
  const navLinks = $("#nav-links");

  function onScrollNav() {
    nav.classList.toggle("scrolled", window.scrollY > 40);
    // 高亮当前区块
    const sections = $$("main section[id]");
    let currentId = "home";
    const probe = window.scrollY + window.innerHeight * 0.35;
    sections.forEach((sec) => {
      if (sec.offsetTop <= probe) currentId = sec.id;
    });
    $$(".nav-links a").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === "#" + currentId);
    });
  }

  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") navLinks.classList.remove("open");
  });

  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- 打字机 ---------- */
  const phrases = [
    "精灵蛋的尺寸与重量里，藏着孵化的秘密 🥚",
    "查蛋 · 配队 · 抓宠 · 攻略，一站搞定 🗺️",
    "来自不同创作者的 PVP / PVE 实战心得 ⚔️",
    "跟随官方公告，第一时间掌握版本动向 📢"
  ];
  const typeEl = $("#typewriter");
  let pi = 0, ci = 0, deleting = false;

  function typeTick() {
    const phrase = phrases[pi];
    if (!deleting) {
      ci++;
      typeEl.innerHTML = esc(phrase.slice(0, ci)) + '<span class="caret"></span>';
      if (ci === phrase.length) {
        deleting = true;
        return setTimeout(typeTick, 2100);
      }
      return setTimeout(typeTick, 70);
    }
    ci--;
    typeEl.innerHTML = esc(phrase.slice(0, ci)) + '<span class="caret"></span>';
    if (ci === 0) {
      deleting = false;
      pi = (pi + 1) % phrases.length;
      return setTimeout(typeTick, 350);
    }
    return setTimeout(typeTick, 32);
  }
  typeTick();

  /* ---------- Hero 视差 ---------- */
  const heroSky = $(".hero-sky");
  const heroContent = $(".hero-content");
  let px = 0, py = 0;

  window.addEventListener("scroll", () => {
    if (heroSky) heroSky.style.transform = "translateY(" + window.scrollY * 0.22 + "px)";
  }, { passive: true });

  window.addEventListener("mousemove", (e) => {
    px = (e.clientX / window.innerWidth - 0.5) * 14;
    py = (e.clientY / window.innerHeight - 0.5) * 10;
    if (heroContent) heroContent.style.transform = "translate(" + px + "px, " + py + "px)";
  }, { passive: true });

  /* ---------- 魔法粒子画布 ---------- */
  const canvas = $("#magic-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [], W = 0, H = 0, rafId = null;

  function resizeCanvas() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const count = Math.min(90, Math.floor((W * H) / 22000));
    particles = Array.from({ length: count }, () => makeParticle(true));
  }

  function makeParticle(anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 10,
      r: 0.8 + Math.random() * 2.2,
      speed: 0.12 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 0.25,
      alpha: 0.25 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.55 ? "255, 201, 77" : (Math.random() < 0.5 ? "111, 195, 255" : "255, 126, 182")
    };
  }

  function drawParticles(now) {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y -= p.speed;
      p.x += p.drift + Math.sin(now / 1600 + p.phase) * 0.12;
      if (p.y < -12) Object.assign(p, makeParticle(false), { x: Math.random() * W });
      if (p.x < -12) p.x = W + 10;
      if (p.x > W + 12) p.x = -10;
      const tw = 0.55 + 0.45 * Math.sin(now / 700 + p.phase);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + p.hue + "," + (p.alpha * tw) + ")";
      ctx.fill();
      if (p.r > 2.1) {
        ctx.beginPath();
        ctx.arc(p.x - p.r * 2.4, p.y + p.r * 1.8, p.r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.hue + "," + (p.alpha * tw * 0.6) + ")";
        ctx.fill();
      }
    }
    rafId = requestAnimationFrame(drawParticles);
  }

  function startCanvas() {
    resizeCanvas();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(drawParticles);
  }
  startCanvas();
  window.addEventListener("resize", startCanvas);

  /* ---------- 滚动出现动效 ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        revealObserver.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });

  function observeReveals(root) {
    (root || document).querySelectorAll(".reveal:not(.in)").forEach((el) => revealObserver.observe(el));
  }
  observeReveals();

  /* ============================================================
     官方公告
     ============================================================ */
  const newsGrid = $("#news-grid");
  const updatedEl = $("#news-updated");
  const netStatus = $("#net-status");
  let currentFilter = "all";
  const STATUS_TEXT = { ongoing: "进行中", upcoming: "即将开启", ended: "已结束" };

  function getStatus(a, now) {
    const s = new Date(a.start);
    if (a.end) {
      const e = new Date(a.end);
      if (now > e) return "ended";
    }
    if (now < s) return "upcoming";
    return "ongoing";
  }

  function countdownText(endIso) {
    if (!endIso) return "";
    const diff = new Date(endIso).getTime() - Date.now();
    if (diff <= 0) return "";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return "剩余 " + d + " 天 " + h + " 小时";
    if (h > 0) return "剩余 " + h + " 小时 " + m + " 分";
    return "剩余 " + m + " 分";
  }

  function renderNews() {
    const now = new Date();
    const items = SITE_DATA.announcements
      .map((a) => ({ a, status: getStatus(a, now) }))
      .filter(({ status }) => currentFilter === "all" || status === currentFilter);

    if (!items.length) {
      newsGrid.innerHTML = '<p class="note" style="grid-column:1/-1">当前筛选下暂无公告～</p>';
      return;
    }

    newsGrid.innerHTML = items.map(({ a, status }) => {
      const tagCls = a.tagColor === "blue" ? "blue" : a.tagColor === "pink" ? "pink" : a.tagColor === "green" ? "green" : "";
      const cd = status === "ongoing" && a.end ? '<span class="countdown" data-end="' + a.end + '">' + countdownText(a.end) + "</span>" : "";
      const dateLine = "<span>开始：<b>" + fmtDate(a.start) + "</b></span><span>结束：<b>" + (a.end ? fmtDate(a.end) : "长期进行") + "</b></span>";
      const details = (a.details || []).map((d) => "<li>" + esc(d) + "</li>").join("");
      return (
        '<article class="glass news-card reveal">' +
          '<div class="card-top">' +
            '<span class="news-tag ' + tagCls + '">' + esc(a.tag) + "</span>" +
            '<span class="status-badge ' + status + '">' + STATUS_TEXT[status] + "</span>" +
          "</div>" +
          "<h3>" + esc(a.title) + "</h3>" +
          '<div class="date-line">' + dateLine + cd + "</div>" +
          '<p class="summary">' + esc(a.summary) + "</p>" +
          "<ul class=\"details\">" + details + "</ul>" +
          '<div class="card-foot">' +
            '<span class="source">来源：' + esc(a.source) + "</span>" +
            '<a class="src-link" href="' + esc(a.url) + '" target="_blank" rel="noopener noreferrer">查看原文 ↗</a>' +
          "</div>" +
        "</article>"
      );
    }).join("");

    observeReveals(newsGrid);
  }

  $("#news-filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    $$(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
    renderNews();
  });

  // 倒计时每秒刷新
  setInterval(() => {
    $$("#news-grid .countdown").forEach((el) => {
      const end = el.dataset.end;
      const text = countdownText(end);
      el.textContent = text;
      if (!text) renderNews();
    });
  }, 1000);

  // 刷新公告（检测网络可达性；数据为本地收录）
  $("#refresh-news").addEventListener("click", async () => {
    const btn = $("#refresh-news");
    btn.textContent = "⏳ 检查中…";
    btn.disabled = true;
    const urls = [
      "https://roco.qq.com/",
      "https://www.wegame.com.cn/",
      "https://www.taptap.cn/"
    ];
    try {
      await Promise.race([
        Promise.all(urls.map((u) => fetch(u, { mode: "no-cors", cache: "no-store" }))),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000))
      ]);
      netStatus.textContent = "网络正常 · 展示最近收录公告";
      toast("✅ 网络正常！当前展示最近收录的公告（" + SITE_DATA.updatedAt + "）");
    } catch (err) {
      netStatus.textContent = "网络受限 · 本地收录模式";
      toast("📡 无法连接官方渠道（网络受限），已展示最近收录公告（" + SITE_DATA.updatedAt + "）");
    } finally {
      btn.textContent = "🔄 刷新公告";
      btn.disabled = false;
    }
  });

  updatedEl.textContent = SITE_DATA.updatedAt;

  /* ============================================================
     查蛋系统
     ============================================================ */
  const lenSlider = $("#egg-len"), lenVal = $("#egg-len-val");
  const wSlider = $("#egg-w"), wVal = $("#egg-w-val");
  const matchList = $("#egg-match-list"), matchEmpty = $("#egg-match-empty"), ballTip = $("#ball-tip");
  const hatchBtn = $("#hatch-btn"), shell = $("#egg-shell"), eggResult = $("#egg-result");
  const resultEmoji = $("#result-emoji"), resultName = $("#result-name");
  const eggStage = $("#egg-stage");
  let hatching = false;

  function round2(n) { return Math.round(n * 100) / 100; }

  function currentValues() {
    return { len: parseFloat(lenSlider.value), w: parseFloat(wSlider.value) };
  }

  function findMatches(len, w) {
    const exact = [];
    SITE_DATA.eggZones.forEach((zone) => {
      zone.pets.forEach((p) => {
        if (len >= p.l0 && len <= p.l1 && w >= p.w0 && w <= p.w1) {
          exact.push({ pet: p, zone });
        }
      });
    });
    if (exact.length) return { list: exact, mode: "exact" };

    // 重量命中但长度不符
    const byWeight = [];
    SITE_DATA.eggZones.forEach((zone) => {
      zone.pets.forEach((p) => {
        if (w >= p.w0 && w <= p.w1) byWeight.push({ pet: p, zone });
      });
    });
    if (byWeight.length) return { list: byWeight.slice(0, 8), mode: "weight" };

    // 找最近的重量档
    let bestZone = null, bestDist = Infinity;
    SITE_DATA.eggZones.forEach((zone) => {
      const dist = Math.abs(w - (zone.pets[0].w0 + zone.pets[zone.pets.length - 1].w1) / 2);
      if (dist < bestDist) { bestDist = dist; bestZone = zone; }
    });
    const near = bestZone.pets
      .map((p) => ({ pet: p, zone: bestZone, dist: Math.abs(w - (p.w0 + p.w1) / 2) }))
      .sort((x, y) => x.dist - y.dist)
      .slice(0, 8);
    return { list: near, mode: "near" };
  }

  function renderMatches() {
    const { len, w } = currentValues();
    const res = findMatches(len, w);
    matchEmpty.classList.add("hidden");

    if (!res.list.length) {
      matchList.innerHTML = "";
      matchEmpty.classList.remove("hidden");
      ballTip.textContent = "暂无建议";
      return;
    }

    const modeNote = res.mode === "exact" ? "" : res.mode === "weight" ? "（重量命中）" : "（相近档位）";
    matchList.innerHTML = res.list.map(({ pet, zone }) =>
      '<li><b>' + esc(pet.name) + "</b> <span class=\"zone-tag\">" + zone.key + " 档 " +
      round2(pet.l0) + "–" + round2(pet.l1) + "米 · " + round2(pet.w0) + "–" + round2(pet.w1) + "kg</span></li>"
    ).join("");

    const zone = res.list[0].zone;
    ballTip.textContent = zone.ball + " " + modeNote;
  }

  function updateSliders() {
    const { len, w } = currentValues();
    lenVal.textContent = len.toFixed(2) + " 米";
    wVal.textContent = w.toFixed(2) + " 千克";
    renderMatches();
  }

  lenSlider.addEventListener("input", updateSliders);
  wSlider.addEventListener("input", updateSliders);

  // 孵化火花
  function burstSparks() {
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.5;
      const dist = 60 + Math.random() * 90;
      s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      s.style.setProperty("--dy", Math.sin(angle) * dist - 30 + "px");
      s.style.background = ["#ffc94d", "#ff7eb6", "#5ee6a8", "#6fc3ff"][i % 4];
      eggStage.appendChild(s);
      setTimeout(() => s.remove(), 950);
    }
  }

  function pickReveal() {
    const { len, w } = currentValues();
    const res = findMatches(len, w);
    if (res.list.length) {
      const pick = res.list[Math.floor(Math.random() * res.list.length)];
      return { name: pick.pet.name, zone: pick.zone };
    }
    // 兜底：随机一档
    const zone = SITE_DATA.eggZones[Math.floor(Math.random() * SITE_DATA.eggZones.length)];
    const pet = zone.pets[Math.floor(Math.random() * zone.pets.length)];
    return { name: pet.name, zone };
  }

  hatchBtn.addEventListener("click", () => {
    if (hatching) return;
    hatching = true;
    const btn = hatchBtn;
    btn.disabled = true;
    btn.textContent = "🥚 孵化中…";

    // 重置
    shell.classList.remove("shake", "cracked");
    eggResult.classList.add("hidden");

    setTimeout(() => {
      shell.classList.add("shake");
    }, 60);

    setTimeout(() => {
      shell.classList.add("cracked");
    }, 1800);

    setTimeout(() => {
      const r = pickReveal();
      resultEmoji.textContent = r.zone.emoji;
      resultName.textContent = r.name;
      eggResult.classList.remove("hidden");
      burstSparks();
      toast("🎉 孵出了「" + r.name + "」！(" + r.zone.name + ")");
      hatching = false;
      btn.disabled = false;
      btn.textContent = "✨ 孵化 & 鉴定";
      // 动画结束后再移除 crack 便于下次
      setTimeout(() => shell.classList.remove("shake", "cracked"), 2200);
    }, 2600);
  });

  // 对照表
  function renderZones() {
    const wrap = $("#egg-zones");
    wrap.innerHTML = SITE_DATA.eggZones.map((zone, zi) => {
      const rows = zone.pets.map((p, i) =>
        "<tr><td class=\"no\">" + (i + 1) + "</td><td class=\"pet-name\">" + esc(p.name) + "</td>" +
        "<td>" + round2(p.l0) + " – " + round2(p.l1) + "</td><td>" + round2(p.w0) + " – " + round2(p.w1) + "</td></tr>"
      ).join("");
      return (
        '<div class="zone-block' + (zi === 4 ? " open" : "") + '">' +
          '<div class="zone-summary" role="button" tabindex="0">' +
            '<span style="color:' + zone.color + '">' + zone.emoji + "</span>" +
            "<span>" + esc(zone.name) + "</span>" +
            '<span class="zone-bar"><i style="width:' + (18 + zi * 18) + "%;background:" + zone.color + '"></i></span>' +
            '<span class="zone-arrow">▶</span>' +
          "</div>" +
          '<div class="zone-table">' +
            '<p class="hint">' + esc(zone.range) + " · 建议用球：<b style=\"color:" + zone.color + "\">" + esc(zone.ball) + "</b></p>" +
            "<table><thead><tr><th></th><th>精灵</th><th>蛋长（米）</th><th>重量（千克）</th></tr></thead>" +
            "<tbody>" + rows + "</tbody></table>" +
          "</div>" +
        "</div>"
      );
    }).join("");

    $$(".zone-summary").forEach((sum) => {
      const toggle = () => sum.parentElement.classList.toggle("open");
      sum.addEventListener("click", toggle);
      sum.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });
  }

  /* ============================================================
     PVP 阵容
     ============================================================ */
  function renderPvp() {
    const grid = $("#pvp-grid");
    grid.innerHTML = SITE_DATA.pvp.map((item) => {
      const members = item.members.map((m) => '<span class="member-chip">' + esc(m) + "</span>").join("");
      const tags = (item.tags || []).map((t) => '<span class="tag">' + esc(t) + "</span>").join("");
      const tips = (item.tips || []).map((t) => "<li>" + esc(t) + "</li>").join("");
      const typeCls = item.typeColor ? " " + item.typeColor : "";
      return (
        '<article class="glass lineup-card reveal" data-name="' + esc(item.name) + '">' +
          '<div class="lineup-head"><h3>' + esc(item.name) + "</h3>" +
          '<span class="lineup-type' + typeCls + '">' + esc(item.type) + "</span></div>" +
          '<div class="tag-row">' + tags + "</div>" +
          '<div class="members">' + members + "</div>" +
          '<p class="strategy">' + item.strategy + "</p>" +
          (tips ? "<ul class=\"tips\">" + tips + "</ul>" : "") +
          '<div class="lineup-foot">' +
            '<span class="creator">创作者：<b>' + esc(item.creator) + "</b> · " + esc(item.date) + "</span>" +
            '<button class="copy-btn" type="button">📋 复制阵容</button>' +
          "</div>" +
        "</article>"
      );
    }).join("");

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".copy-btn");
      if (!btn) return;
      const card = btn.closest(".lineup-card");
      const name = card.dataset.name;
      const item = SITE_DATA.pvp.find((p) => p.name === name);
      if (!item) return;
      const text =
        "【" + item.name + "】(" + item.type + ")\n" +
        "成员：" + item.members.join(" / ") + "\n" +
        "打法：" + item.strategy.replace(/<[^>]+>/g, "") + "\n" +
        "创作者：" + item.creator + "（" + item.date + "）\n" +
        "来源：" + item.source;
      copyText(text, "✅ 阵容已复制到剪贴板！");
    });

    observeReveals(grid);
  }

  function copyText(text, okMsg) {
    const done = () => toast(okMsg);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("复制失败，请手动复制"); }
    document.body.removeChild(ta);
  }

  /* ============================================================
     PVE 攻略
     ============================================================ */
  function renderPve() {
    const grid = $("#pve-grid");
    grid.innerHTML = SITE_DATA.pve.map((item) =>
      '<article class="glass pve-card reveal">' +
        '<div class="pve-emoji">' + item.emoji + "</div>" +
        "<h3>" + esc(item.name) + "</h3>" +
        '<div class="pve-role">' + esc(item.role) + "</div>" +
        "<p>" + item.desc + "</p>" +
        '<span class="creator">来源：' + esc(item.creator) + "</span>" +
      "</article>"
    ).join("");
    observeReveals(grid);
  }

  function renderTimeline() {
    const ol = $("#timeline");
    ol.innerHTML = SITE_DATA.timeline.map((t) => "<li>" + t + "</li>").join("");
  }

  /* ============================================================
     孵蛋知识
     ============================================================ */
  function renderRules() {
    const wrap = $("#egg-rules");
    wrap.innerHTML = SITE_DATA.eggRules.map((r) =>
      '<div class="glass rule-card reveal">' +
        '<div class="rule-emoji">' + r.emoji + "</div>" +
        "<h3>" + esc(r.title) + "</h3>" +
        "<ul>" + r.items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul>" +
      "</div>"
    ).join("");
    observeReveals(wrap);
  }

  /* ============================================================
     关于
     ============================================================ */
  function renderAbout() {
    const list = $("#official-links");
    list.innerHTML = SITE_DATA.officialLinks.map((l) =>
      '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer"><span>🔗</span>' + esc(l.label) + "</a></li>"
    ).join("");
    $("#credits").textContent = SITE_DATA.credits;
  }

  /* ============================================================
     页脚时钟
     ============================================================ */
  function tickClock() {
    const now = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const el = $("#footer-clock");
    if (el) el.textContent = "北京时间 " + now.getFullYear() + "-" + p(now.getMonth() + 1) + "-" + p(now.getDate()) + " " + p(now.getHours()) + ":" + p(now.getMinutes()) + ":" + p(now.getSeconds());
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------- 初始化 ---------- */
  renderNews();
  renderZones();
  renderMatches();
  renderPvp();
  renderPve();
  renderTimeline();
  renderRules();
  renderAbout();
})();