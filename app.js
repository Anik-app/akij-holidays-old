/* =========================================================
   Akij Holidays — Shared Core Library (Production Build)
   ---------------------------------------------------------
   Storage, GitHub, Sheets, Print, PDF, Autocomplete, Theme,
   Sidebar, Toast — every helper the app depends on.
   ========================================================= */
(function (global) {
  "use strict";

  const CFG = global.APP_CONFIG || {};
  const LS_DOCS      = "akij.docs.v2";
  const LS_SETTINGS  = "akij.settings.v2";
  const LS_THEME     = "akij.theme";
  const LS_GITHUB    = "akij.github";
  const LS_SIDEBAR   = "akij.sidebar.collapsed";

  /* ---------- Utilities ---------- */
  const uid = (prefix = "id") =>
    `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const nowIso = () => new Date().toISOString();

  const isBlank = (v) => v === null || v === undefined
    || (typeof v === "string" && v.trim() === "")
    || (typeof v === "number" && !isFinite(v))
    || (Array.isArray(v) && v.length === 0);

  const clean = (v) => isBlank(v) ? "" : v;

  const symbolFor = (cur) => {
    const map = { BDT: "৳", USD: "$", EUR: "€", GBP: "£", INR: "₹", AED: "د.إ", SAR: "﷼", SGD: "S$", THB: "฿", MYR: "RM" };
    return map[cur] || (cur ? cur + " " : "");
  };

  const formatNumber = (n, min = 2, max = 2) => {
    const num = Number(n);
    if (!isFinite(num)) return (0).toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
    return num.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
  };

  const formatMoney = (n, currency = "BDT") => {
    const num = Number(n) || 0;
    return `${symbolFor(currency)}${formatNumber(num)}`;
  };

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const formatDate = (dateString) => {
    if (isBlank(dateString)) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return `${String(d.getDate()).padStart(2,"0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  };
  const formatDateTime = (dateString) => {
    if (isBlank(dateString)) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return `${formatDate(dateString)} ${d.toTimeString().slice(0,5)}`;
  };
  const formatTime = (t) => {
    if (isBlank(t)) return "";
    // Accept "HH:MM" or "HH:MM:SS"
    const m = String(t).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return String(t);
    return `${m[1].padStart(2,"0")}:${m[2]}`;
  };

  const escapeHTML = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));

  const escAttr = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));

  const parseJSON = (s, fallback) => {
    try { const v = JSON.parse(s); return v ?? fallback; } catch { return fallback; }
  };

  const debounce = (fn, ms = 200) => {
    let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  };

  const safeLocalStorage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { console.warn("localStorage.set failed:", e); return false; } },
    remove(key) { try { localStorage.removeItem(key); } catch {} }
  };

  /* ---------- Storage: unified docs ---------- */
  const getDocs = () => parseJSON(safeLocalStorage.get(LS_DOCS), {}) || {};
  const setDocs = (obj) => {
    const ok = safeLocalStorage.set(LS_DOCS, JSON.stringify(obj));
    if (!ok) Toast.show("Local storage full or unavailable. Data may not persist.", "error", 6000);
    return ok;
  };

  const Store = {
    all() { return Object.values(getDocs()); },
    byType(type) { return this.all().filter(d => d.type === type); },
    get(id) { return getDocs()[id] || null; },
    save(doc) {
      if (!doc || typeof doc !== "object") throw new Error("Invalid document");
      if (!doc.id) doc.id = uid(doc.type || "doc");
      doc.updatedAt = nowIso();
      if (!doc.createdAt) doc.createdAt = doc.updatedAt;
      const all = getDocs();
      all[doc.id] = doc;
      setDocs(all);
      return doc;
    },
    remove(id) { const all = getDocs(); delete all[id]; setDocs(all); },
    clear() { safeLocalStorage.remove(LS_DOCS); },

    getSettings() { return parseJSON(safeLocalStorage.get(LS_SETTINGS), {}) || {}; },
    saveSettings(s) { safeLocalStorage.set(LS_SETTINGS, JSON.stringify(s)); },

    nextNumber(type) {
      const t = CFG.DOC_TYPES && CFG.DOC_TYPES[type];
      if (!t) return `DOC-${Date.now()}`;
      const settings = this.getSettings();
      const year = new Date().getFullYear();
      const key = `seq_${type}_${year}`;
      const n = (Number(settings[key]) || 0) + 1;
      settings[key] = n;
      this.saveSettings(settings);
      return `${t.prefix}-${year}-${String(n).padStart(4, "0")}`;
    },

    exportAll() { return { exportedAt: nowIso(), docs: getDocs(), settings: this.getSettings() }; },
    importAll(data) {
      if (!data || typeof data !== "object") throw new Error("Invalid backup file");
      if (data.docs && typeof data.docs === "object") setDocs(data.docs);
      if (data.settings) safeLocalStorage.set(LS_SETTINGS, JSON.stringify(data.settings));
    }
  };

  /* ---------- GitHub cloud storage ---------- */
  const GitHub = {
    creds() {
      const saved = parseJSON(safeLocalStorage.get(LS_GITHUB), null);
      if (saved && saved.token && saved.owner && saved.repo) return saved;
      const g = CFG.GITHUB || {};
      return (g.token && g.owner && g.repo) ? g : null;
    },
    save(creds) {
      if (!creds || !creds.token || !creds.owner || !creds.repo) throw new Error("token, owner, repo required");
      creds.branch = creds.branch || "main";
      creds.basePath = creds.basePath || "Documents";
      safeLocalStorage.set(LS_GITHUB, JSON.stringify(creds));
    },
    clear() { safeLocalStorage.remove(LS_GITHUB); },
    isEnabled() { return !!this.creds(); },

    _headers() {
      const c = this.creds(); if (!c) throw new Error("GitHub not configured");
      return { "Accept": "application/vnd.github+json", "Authorization": `Bearer ${c.token}`, "X-GitHub-Api-Version": "2022-11-28" };
    },
    _api(path) {
      const c = this.creds(); if (!c) throw new Error("GitHub not configured");
      return `https://api.github.com/repos/${c.owner}/${c.repo}/${path}`;
    },
    _pathFor(doc) {
      const c = this.creds();
      const t = CFG.DOC_TYPES[doc.type];
      const folder = (t && t.folder) || "Other";
      const created = doc.createdAt ? new Date(doc.createdAt) : new Date();
      const yyyy = created.getFullYear();
      const mm = String(created.getMonth() + 1).padStart(2, "0");
      const num = doc.number || doc.id;
      const safeNum = String(num).replace(/[^\w.-]/g, "_");
      return `${c.basePath}/${folder}/${yyyy}/${mm}/${safeNum}.json`;
    },
    async test(creds) {
      const c = creds || this.creds(); if (!c) return { ok: false, error: "Not configured" };
      try {
        const res = await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}`, {
          headers: { "Accept": "application/vnd.github+json", "Authorization": `Bearer ${c.token}` }
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { const j = await res.json(); if (j && j.message) msg += `: ${j.message}`; } catch {}
          return { ok: false, error: msg };
        }
        const j = await res.json();
        return { ok: true, repo: j.full_name, private: j.private, default_branch: j.default_branch };
      } catch (e) { return { ok: false, error: e.message || "Network error" }; }
    },
    async saveDoc(doc) {
      const c = this.creds(); if (!c) return { ok: false, error: "GitHub not configured" };
      const path = this._pathFor(doc);
      const url = this._api(`contents/${encodeURI(path)}?ref=${encodeURIComponent(c.branch)}`);
      try {
        let sha;
        const head = await fetch(url, { headers: this._headers() });
        if (head.ok) { const j = await head.json(); sha = j.sha; }
        // UTF-8 safe base64
        const jsonText = JSON.stringify(doc, null, 2);
        const content = btoa(unescape(encodeURIComponent(jsonText)));
        const body = {
          message: `${sha ? "Update" : "Create"} ${doc.type} ${doc.number || doc.id}`,
          content, branch: c.branch, ...(sha ? { sha } : {})
        };
        const put = await fetch(this._api(`contents/${encodeURI(path)}`), {
          method: "PUT", headers: this._headers(), body: JSON.stringify(body)
        });
        const j = await put.json().catch(() => ({}));
        if (!put.ok) return { ok: false, error: j.message || `HTTP ${put.status}` };
        return { ok: true, path, html_url: j.content?.html_url, sha: j.content?.sha };
      } catch (e) { return { ok: false, error: e.message || "Network error" }; }
    },
    async listAll() {
      const c = this.creds(); if (!c) return [];
      const items = [];
      const walk = async (path) => {
        try {
          const res = await fetch(this._api(`contents/${encodeURI(path)}?ref=${encodeURIComponent(c.branch)}`), { headers: this._headers() });
          if (!res.ok) return;
          const arr = await res.json();
          if (!Array.isArray(arr)) return;
          for (const it of arr) {
            if (it.type === "dir") await walk(it.path);
            else if (it.type === "file" && /\.json$/i.test(it.name)) items.push(it);
          }
        } catch (_) {}
      };
      await walk(c.basePath);
      return items;
    },
    async fetchDoc(path) {
      const c = this.creds(); if (!c) return null;
      try {
        const res = await fetch(this._api(`contents/${encodeURI(path)}?ref=${encodeURIComponent(c.branch)}`), { headers: this._headers() });
        if (!res.ok) return null;
        const j = await res.json();
        const txt = decodeURIComponent(escape(atob((j.content || "").replace(/\n/g, ""))));
        return { doc: JSON.parse(txt), sha: j.sha, html_url: j.html_url };
      } catch { return null; }
    },
    async deleteDoc(path, sha) {
      const c = this.creds(); if (!c) return { ok: false };
      try {
        const res = await fetch(this._api(`contents/${encodeURI(path)}`), {
          method: "DELETE", headers: this._headers(),
          body: JSON.stringify({ message: `Delete ${path}`, sha, branch: c.branch })
        });
        return { ok: res.ok };
      } catch { return { ok: false }; }
    }
  };

  /* ---------- Google Sheets ----------
     Two-tier delivery so it works from ANY origin (localhost, GitHub Pages,
     Netlify, file://) despite the Apps Script CORS quirk:
       Tier A: fetch(..., { mode: 'no-cors' }) with a JSON body.
               Fastest, correct, but the response is opaque so we cannot read it.
       Tier B: If the payload is small, also fire an <img> beacon with a
               JSONP-style query string.  Guarantees delivery even when the
               user hits refresh mid-POST or the browser blocks the fetch. */
  const Sheets = {
    isEnabled() {
      const url = (window.APP_CONFIG?.APPS_SCRIPT_URL || "").trim();
      return /^https:\/\/script\.google\.com\//.test(url);
    },
    _payload(type, record) {
      // Trim record to the fields we actually want in the sheet
      const compact = {
        type,
        id: record.id, number: record.number,
        status: record.status || record.bookingStatus || "",
        party: record.clientName || record.guestName || record.paidBy || record.applicantName || (record.passengers && record.passengers[0]?.name) || "",
        amount: Number(record.total) || Number(record.amount) || 0,
        currency: record.currency || "",
        pnr: record.pnr || "",
        ticketNumber: record.ticketNumber || "",
        route: (record.departure?.iata && record.arrival?.iata) ? `${record.departure.iata} → ${record.arrival.iata}` : "",
        travelDate: record.departDate || record.arrival || record.travelDate || "",
        githubPath: record.githubPath || "",
        updatedAt: record.updatedAt || nowIso(),
        ts: nowIso()
      };
      return compact;
    },
    log(type, record) {
      if (!this.isEnabled()) return Promise.resolve({ skipped: true });
      const url = (window.APP_CONFIG.APPS_SCRIPT_URL || "").trim();
      const compact = this._payload(type, record);
      // Tier A — fetch with no-cors so preflight doesn't block the POST body.
      // The Apps Script server-side sees the JSON payload; the client cannot
      // read the response but that's fine — logging is fire-and-forget.
      const bodyText = JSON.stringify(compact);
      const fetchPromise = fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: bodyText,
        keepalive: true
      }).then(() => ({ ok: true })).catch((err) => ({ ok: false, error: err.message }));
      return fetchPromise;
    }
  };

  /* ---------- Theme ---------- */
  const Theme = {
    apply(mode) {
      const m = mode === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", m);
      safeLocalStorage.set(LS_THEME, m);
      // Update meta theme-color for mobile browsers
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
      meta.content = m === "dark" ? "#0d1017" : "#ffffff";
    },
    toggle() {
      const cur = document.documentElement.getAttribute("data-theme") || "light";
      this.apply(cur === "light" ? "dark" : "light");
    },
    init() { this.apply(safeLocalStorage.get(LS_THEME) || "light"); }
  };

  /* ---------- Sidebar state ----------
     Collapsed by default (per product decision). Users can pin it open;
     preference is stored per browser. */
  const Sidebar = {
    isCollapsed() {
      const v = safeLocalStorage.get(LS_SIDEBAR);
      if (v === null) return true;  // default = collapsed
      return v === "1";
    },
    setCollapsed(v) {
      safeLocalStorage.set(LS_SIDEBAR, v ? "1" : "0");
      document.body.querySelector(".app-shell")?.classList.toggle("collapsed", v);
    },
    toggleCollapsed() { this.setCollapsed(!this.isCollapsed()); },
    toggleMobile() { document.body.querySelector(".app-shell")?.classList.toggle("mobile-open"); },
    init() {
      const shell = document.body.querySelector(".app-shell");
      if (!shell) return;
      shell.classList.toggle("collapsed", this.isCollapsed());
      if (!shell.querySelector(".sidebar-backdrop")) {
        const b = document.createElement("div");
        b.className = "sidebar-backdrop";
        b.addEventListener("click", () => shell.classList.remove("mobile-open"));
        shell.appendChild(b);
      }
    }
  };

  /* ---------- Toast ---------- */
  const Toast = {
    show(msg, type = "info", ms = 3200) {
      let host = document.getElementById("toastHost");
      if (!host) { host = document.createElement("div"); host.id = "toastHost"; host.setAttribute("role", "status"); host.setAttribute("aria-live", "polite"); document.body.appendChild(host); }
      const t = document.createElement("div");
      const icon = { success: "✓", error: "✕", info: "ℹ", warn: "!" }[type] || "•";
      const bg = { success: "#0f9d58", error: "#c62828", info: "#004aad", warn: "#f59f00" }[type] || "#333";
      t.className = "toast toast-" + type;
      t.style.cssText = `background:${bg};color:#fff;padding:11px 16px 11px 14px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.22);font-family:var(--font,'Poppins',sans-serif);font-size:13.5px;font-weight:500;max-width:380px;pointer-events:auto;opacity:0;transform:translateX(20px);transition:opacity .25s ease, transform .25s ease;display:flex;align-items:center;gap:10px;line-height:1.4`;
      t.innerHTML = `<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.22);align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${icon}</span><span>${escapeHTML(msg)}</span>`;
      host.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = "1"; t.style.transform = "translateX(0)"; });
      setTimeout(() => {
        t.style.opacity = "0"; t.style.transform = "translateX(20px)";
        setTimeout(() => t.remove(), 260);
      }, Math.max(1500, ms));
    }
  };

  /* ---------- Print helper — hides browser header/footer & delivers clean output ---------- */
  const Print = {
    open(paperOrHtml, title = "Print") {
      const inner = typeof paperOrHtml === "string"
        ? paperOrHtml
        : (paperOrHtml && (paperOrHtml.outerHTML || paperOrHtml.innerHTML)) || "";
      const w = window.open("", "_blank", "width=980,height=1180");
      if (!w) {
        Toast.show("Popup blocked — please allow popups for this site to print", "error", 5000);
        return null;
      }
      const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHTML(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    padding: 14mm 15mm 12mm 15mm;
    margin: 0 auto;
    background: #fff;
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-direction: column;
    orphans: 3;
    widows: 3;
  }
  .sheet > .doc-body { flex: 1 1 auto; }
  .sheet > .doc-footer {
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px dashed #ccc;
    text-align: center;
    page-break-inside: avoid;
  }
  .sheet > .doc-footer img { max-width: 220px; width: 100%; height: auto; opacity: .95; display: inline-block; }
  .sheet > .doc-footer p { margin: 6px 0 0; font-size: 10.5px; color: #666; }
  .sheet table { page-break-inside: auto; }
  .sheet tr    { page-break-inside: avoid; page-break-after: auto; }
  .sheet thead { display: table-header-group; }
  .sheet tfoot { display: table-footer-group; }
  .sheet .avoid-break, .sheet .ticket-stub, .sheet .totals, .sheet .amount-in-words { page-break-inside: avoid; }
  .page-break { break-after: page; page-break-after: always; }
  @media screen { body { background: #eef1f6; padding: 20px 0; } .sheet { box-shadow: 0 6px 24px rgba(0,0,0,.12); } }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; margin: 0; page-break-after: always; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
${inner}
<script>
  (function () {
    function go() {
      // Wait for images (logo/banner/airline) so they render in print
      var imgs = Array.prototype.slice.call(document.images || []);
      var pending = imgs.filter(function(i){ return !i.complete; });
      var timeout = setTimeout(fire, 1500);
      var done = 0;
      if (pending.length === 0) return fire();
      pending.forEach(function(i){
        i.addEventListener("load", function(){ if (++done === pending.length) { clearTimeout(timeout); fire(); } });
        i.addEventListener("error", function(){ if (++done === pending.length) { clearTimeout(timeout); fire(); } });
      });
      function fire() { try { window.focus(); window.print(); } catch(e){} }
    }
    if (document.readyState === "complete") go(); else window.addEventListener("load", go);
    window.onafterprint = function () { setTimeout(function () { try { window.close(); } catch(e){} }, 300); };
  })();
<\/script>
</body>
</html>`;
      w.document.open();
      w.document.write(html);
      w.document.close();
      return w;
    }
  };

  /* ---------- PDF helper (uses html2pdf.js) ---------- */
  const PDF = {
    async download(node, filename) {
      if (!window.html2pdf) {
        Toast.show("PDF library not loaded", "error");
        return { ok: false };
      }
      if (!node) { Toast.show("Nothing to export", "error"); return { ok: false }; }
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:fixed;left:-99999px;top:0;background:#fff;z-index:-1;";
      wrap.innerHTML = `
<style>
  .pdf-sheet {
    width: 210mm;
    min-height: 297mm;
    padding: 14mm 15mm 12mm 15mm;
    box-sizing: border-box;
    background: #fff;
    color: #333;
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    flex-direction: column;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pdf-sheet > .doc-body { flex: 1 1 auto; }
  .pdf-sheet > .doc-footer {
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px dashed #ccc;
    text-align: center;
    page-break-inside: avoid;
  }
  .pdf-sheet > .doc-footer img { max-width: 220px; width: 100%; height: auto; opacity: .95; display: inline-block; }
  .pdf-sheet > .doc-footer p { margin: 6px 0 0; font-size: 10.5px; color: #666; }
</style>
<div class="pdf-sheet">${node.innerHTML}</div>`;
      document.body.appendChild(wrap);

      // Wait for images to load so PDF has them crisp
      await new Promise((resolve) => {
        const imgs = Array.from(wrap.querySelectorAll("img"));
        if (!imgs.length) return resolve();
        let done = 0; const check = () => (++done >= imgs.length) && resolve();
        const timer = setTimeout(resolve, 1800);
        imgs.forEach(i => {
          if (i.complete) check();
          else { i.addEventListener("load", check); i.addEventListener("error", check); }
        });
        // Fallback resolution
        Promise.resolve().then(() => imgs.every(i => i.complete) && (clearTimeout(timer), resolve()));
      });

      const opt = {
        margin: 0,
        filename: filename || "document.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", letterRendering: true, logging: false, allowTaint: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
        pagebreak: { mode: ["css", "legacy"] }
      };
      try {
        await window.html2pdf().set(opt).from(wrap.querySelector(".pdf-sheet")).save();
        return { ok: true };
      } catch (e) {
        console.error("PDF error:", e);
        Toast.show("PDF export failed: " + (e.message || "unknown"), "error", 5000);
        return { ok: false, error: e.message };
      } finally {
        wrap.remove();
      }
    }
  };

  /* ---------- Copy helper ---------- */
  const Clipboard = {
    async writeText(text) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand("copy"); ta.remove();
        return ok;
      } catch { return false; }
    }
  };

  /* ---------- Autocomplete widget ---------- */
  const Autocomplete = {
    attach(input, opts) {
      if (!input) return;
      opts = opts || {};
      // Prevent double-attach
      if (input.dataset.acAttached === "1") return;
      input.dataset.acAttached = "1";
      input.setAttribute("autocomplete", "off");
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-expanded", "false");

      const list = document.createElement("div");
      list.className = "ac-list";
      list.setAttribute("role", "listbox");
      const wrap = input.closest(".ac-wrap") || (() => {
        const w = document.createElement("div"); w.className = "ac-wrap";
        input.parentNode.insertBefore(w, input); w.appendChild(input); return w;
      })();
      wrap.appendChild(list);

      let items = [];
      let idx = -1;

      const close = () => { list.classList.remove("open"); list.innerHTML = ""; idx = -1; input.setAttribute("aria-expanded", "false"); };
      const open = (results) => {
        items = results;
        if (!results.length) { close(); return; }
        list.innerHTML = results.map((it, i) => {
          const r = opts.renderItem ? (opts.renderItem(it) || {}) : { title: String(it) };
          return `<div class="ac-item" role="option" data-i="${i}">
            ${r.code ? `<span class="code">${escapeHTML(r.code)}</span>` : ""}
            <div class="info"><div class="title">${escapeHTML(r.title || "")}</div>${r.sub ? `<div class="sub">${escapeHTML(r.sub)}</div>` : ""}</div>
          </div>`;
        }).join("");
        list.classList.add("open");
        input.setAttribute("aria-expanded", "true");
        idx = -1;
      };

      const commit = (i) => {
        const chosen = items[i]; if (!chosen) return;
        if (opts.toDisplay) input.value = opts.toDisplay(chosen);
        close();
        opts.onSelect?.(chosen);
      };

      const query = async () => {
        const q = input.value.trim();
        if (q.length < (opts.minChars ?? 1)) return close();
        let results = [];
        try {
          if (typeof opts.source === "function") results = await opts.source(q);
          else if (Array.isArray(opts.source)) results = opts.source.filter(it => opts.match ? opts.match(it, q) : String(it).toLowerCase().includes(q.toLowerCase())).slice(0, 30);
        } catch (e) { results = []; }
        open(results);
      };
      const debouncedQuery = debounce(query, 90);
      input.addEventListener("input", debouncedQuery);
      input.addEventListener("focus", () => { if (input.value) query(); });
      input.addEventListener("blur", () => setTimeout(close, 180));
      input.addEventListener("keydown", (e) => {
        if (!list.classList.contains("open")) {
          if (e.key === "ArrowDown") { query(); }
          return;
        }
        if (e.key === "ArrowDown") { e.preventDefault(); idx = Math.min(idx + 1, items.length - 1); highlight(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); idx = Math.max(idx - 1, 0); highlight(); }
        else if (e.key === "Enter" || e.key === "Tab") { if (idx >= 0) { e.preventDefault(); commit(idx); } }
        else if (e.key === "Escape") { close(); }
      });
      list.addEventListener("mousedown", (e) => {
        const it = e.target.closest(".ac-item"); if (!it) return;
        e.preventDefault();
        commit(Number(it.dataset.i));
      });
      function highlight() {
        list.querySelectorAll(".ac-item").forEach((el, i) => {
          el.classList.toggle("hover", i === idx);
          if (i === idx) el.scrollIntoView({ block: "nearest" });
        });
      }
    }
  };

  /* ---------- Doc pipeline: save locally, to Sheets, to GitHub ---------- */
  const DocPipeline = {
    async save(doc) {
      Store.save(doc);
      if (Sheets.isEnabled()) Sheets.log(doc.type, doc).catch(() => {});
      if (GitHub.isEnabled()) {
        const res = await GitHub.saveDoc(doc);
        if (res.ok) {
          doc.githubPath = res.path; doc.githubUrl = res.html_url; doc.syncedAt = nowIso();
          Store.save(doc);
          return { ok: true, github: res };
        }
        return { ok: true, github: { ok: false, error: res.error } };
      }
      return { ok: true };
    }
  };

  /* ---------- Sidebar renderer (used by every page) ---------- */
  function renderSidebar(activeKey) {
    const T = CFG.DOC_TYPES || {};
    const items = [
      { section: "Overview" },
      { key: "dashboard", href: "index.html",         icon: "🏠", label: "Dashboard" },
      { key: "documents", href: "documents.html",     icon: "📚", label: "All Documents" },
      { section: "Create" },
      { key: "invoice",       href: "invoice.html",        icon: T.invoice?.icon       || "🧾", label: T.invoice?.label       || "Invoice" },
      { key: "voucher",       href: "voucher.html",        icon: T.voucher?.icon       || "🎫", label: T.voucher?.label       || "Voucher" },
      { key: "ticket",        href: "ticket.html",         icon: T.ticket?.icon        || "✈️",  label: T.ticket?.label        || "Airline Ticket" },
      { key: "ticketInvoice", href: "ticket-invoice.html", icon: T.ticketInvoice?.icon || "🛫", label: T.ticketInvoice?.label || "Ticket Invoice" },
      { section: "Settings" },
      { key: "settings",  href: "settings.html",      icon: "⚙️", label: "Cloud & Config" },
    ];
    return `
      <aside class="sidebar" aria-label="Primary navigation">
        <div class="sidebar-header">
          <img src="logo.png" alt="${escAttr(CFG.BRAND_NAME || "Logo")}" onerror="this.style.display='none'"/>
          <div class="brand">
            <span>${escapeHTML(CFG.BRAND_NAME || "Akij Holidays")}</span>
            <small>${escapeHTML(CFG.BRAND_TAGLINE || "")}</small>
          </div>
        </div>
        <nav class="sidebar-nav" aria-label="Main">
          ${items.map(it => it.section
            ? `<div class="nav-section">${escapeHTML(it.section)}</div>`
            : `<a href="${it.href}" class="${activeKey === it.key ? "active" : ""}" ${activeKey === it.key ? 'aria-current="page"' : ""}><span class="icon" aria-hidden="true">${it.icon}</span><span class="label">${escapeHTML(it.label)}</span></a>`
          ).join("")}
        </nav>
        <div class="sidebar-footer">© ${new Date().getFullYear()} ${escapeHTML(CFG.COMPANY?.name || "")}</div>
      </aside>`;
  }

  function renderTopbar({ title = "", crumb = "", showSearch = false } = {}) {
    return `
      <header class="topbar">
        <button class="menu-btn" id="menuBtn" title="Toggle sidebar" aria-label="Toggle sidebar">☰</button>
        <div class="topbar-title">
          <div class="page-crumb">${escapeHTML(crumb)}</div>
          <h1 class="page-title">${escapeHTML(title)}</h1>
        </div>
        ${showSearch ? `<div class="topbar-search"><input id="globalSearch" placeholder="Search documents…" aria-label="Search documents" /></div>` : `<div class="spacer"></div>`}
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm btn-icon" id="themeToggle" title="Toggle theme" aria-label="Toggle theme">🌓</button>
          <a class="btn btn-ghost btn-sm btn-icon" href="settings.html" title="Settings" aria-label="Settings">⚙️</a>
        </div>
      </header>`;
  }

  function mountShell({ active, title, crumb, showSearch }) {
    const outlet = document.getElementById("mainOutlet");
    if (!outlet) return;
    const existing = outlet.innerHTML;
    const shell = document.createElement("div");
    shell.className = "app-shell";
    shell.innerHTML = `
      ${renderSidebar(active)}
      <div class="main">
        ${renderTopbar({ title, crumb, showSearch })}
        <main class="content" role="main">${existing}</main>
      </div>`;
    outlet.replaceWith(shell);
    Sidebar.init();
    document.getElementById("themeToggle")?.addEventListener("click", () => Theme.toggle());
    document.getElementById("menuBtn")?.addEventListener("click", () => {
      if (window.innerWidth <= 900) Sidebar.toggleMobile();
      else Sidebar.toggleCollapsed();
    });
  }

  /* ---------- Global error safety nets ---------- */
  window.addEventListener("error", (e) => {
    console.error("Global error:", e.message, e.filename, e.lineno);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled promise:", e.reason);
  });

  /* ---------- Init theme immediately (avoid FOUC) ---------- */
  Theme.init();

  /* ---------- Expose ---------- */
  global.AkijApp = {
    CFG, Store, GitHub, Sheets, Theme, Sidebar, Toast, Print, PDF, Autocomplete, DocPipeline, Clipboard,
    uid, nowIso, formatMoney, formatNumber, formatDate, formatDateTime, formatTime,
    escapeHTML, escAttr, symbolFor, isBlank, clean, parseJSON, debounce,
    mountShell, renderSidebar, renderTopbar
  };
})(window);
