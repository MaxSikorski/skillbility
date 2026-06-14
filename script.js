/* ============================================================
   Skillbility store — front end (vanilla JS)
   ============================================================ */

/* The registry is the single source of truth. On a hosted/served site we fetch
   the live registry/index.json; opened straight from file:// (where browsers
   block fetch for security) we fall back to this embedded copy so the store
   still works by double-clicking and fully offline.
   KEEP INDEX_FALLBACK in sync with registry/index.json. */
const INDEX_FALLBACK = {
    skill_count: 3,
    generated_at: "2026-06-14",
    skills: [
        { id:"filament-swap", name:"Filament Swap", version:"1.0.0", icon:"🧵", license:"MIT",
          risk_level:"medium", author:{ name:"Skillbility", url:"https://github.com/MaxSikorski/skillbility" },
          variables:[1,2,3,4,5,6], path:"registry/skills/filament-swap",
          description:"One-command filament loading and unloading with automatic nozzle heating and a clean purge." },
        { id:"maintenance-park", name:"Maintenance Park", version:"1.0.0", icon:"🔧", license:"MIT",
          risk_level:"medium", author:{ name:"Skillbility", url:"https://github.com/MaxSikorski/skillbility" },
          variables:[1,2,3], path:"registry/skills/maintenance-park",
          description:"Moves the toolhead front-and-center at a comfortable height for nozzle swaps, cleaning, and inspection." },
        { id:"status-report", name:"Status Report", version:"1.0.0", icon:"📋", license:"MIT",
          risk_level:"low", author:{ name:"Skillbility", url:"https://github.com/MaxSikorski/skillbility" },
          variables:[], path:"registry/skills/status-report",
          description:"One command prints a clean snapshot of temps, position, homing state, and speed factor to the console." }
    ]
};

const grid = document.getElementById("grid");
const statusline = document.getElementById("statusline");

function escapeHTML(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function cardHTML(s) {
    const lvl  = s.risk_level || "high";
    const vars = (s.variables || []).length;
    const src  = s.path ? (s.path + "/skill.json") : ((s.author && s.author.url) || "#");
    const cmd  = "python3 ~/skillbility.py install " + s.id;
    return `
    <article class="card">
        <div class="card-head">
            <span class="card-icon" aria-hidden="true">${escapeHTML(s.icon) || "📦"}</span>
            <h3 class="card-title">${escapeHTML(s.name)}</h3>
        </div>
        <p class="card-desc">${escapeHTML(s.description)}</p>
        <div class="meta">
            <span class="risk risk-${escapeHTML(lvl)}"><span class="dot"></span>${escapeHTML(lvl)} risk</span>
            <span class="dim">v${escapeHTML(s.version)}</span>
            <span class="dim">${escapeHTML(s.license)}</span>
            ${vars ? `<span class="dim">${vars} setting${vars > 1 ? "s" : ""}</span>` : ""}
        </div>
        <div class="code-block code-row">
            <code id="cmd-${escapeHTML(s.id)}">${escapeHTML(cmd)}</code>
            <button class="copy-btn" data-copy="cmd-${escapeHTML(s.id)}" aria-label="Copy install command">Copy</button>
        </div>
        <div class="card-foot">
            <span>by ${escapeHTML((s.author && s.author.name) || "unknown")}</span>
            <a href="${escapeHTML(src)}">source</a>
        </div>
    </article>`;
}

function render(index, note) {
    const order = { low:0, medium:1, high:2 };
    const skills = (index.skills || []).slice().sort(
        (a, b) => (order[a.risk_level] ?? 3) - (order[b.risk_level] ?? 3)
    );
    grid.innerHTML = skills.length
        ? skills.map(cardHTML).join("")
        : `<div class="empty">No skills yet. The first ones publish via a pull request against the registry.</div>`;
    statusline.textContent = note;
    wireCopyButtons();
    revealCards();
}

function wireCopyButtons() {
    document.querySelectorAll(".copy-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const el = document.getElementById(btn.dataset.copy);
            const text = el ? el.textContent : "";
            try {
                await navigator.clipboard.writeText(text);
            } catch (_) {
                // fallback for file:// where the async clipboard API may be blocked
                const t = document.createElement("textarea");
                t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
                document.body.appendChild(t); t.select();
                try { document.execCommand("copy"); } catch (e) {}
                document.body.removeChild(t);
            }
            const orig = btn.textContent;
            btn.textContent = "Copied"; btn.classList.add("done");
            setTimeout(() => { btn.textContent = orig; btn.classList.remove("done"); }, 1500);
        });
    });
}

/* ---- load catalog: live registry first, embedded fallback for file:// ---- */
fetch("registry/index.json")
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(idx => render(idx,
        `${idx.skill_count} skills · live registry${idx.generated_at ? ` · updated ${String(idx.generated_at).slice(0, 10)}` : ""}`))
    .catch(() => render(INDEX_FALLBACK,
        `${INDEX_FALLBACK.skill_count} skills · local catalog (offline preview)`));

/* ---------- theme toggle (persisted) ---------- */
const themeBtn  = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const sunPath  = "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z";
const moonPath = "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const saved = localStorage.getItem("theme");
let isDark = saved ? saved === "dark" : prefersDark.matches;

function applyTheme(dark, animate = true) {
    document.body.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#000000" : "#f5f5f7";
    themeIcon.querySelector("path").setAttribute("d", dark ? sunPath : moonPath);
    if (animate && window.gsap) {
        gsap.fromTo(themeIcon, { rotation:0, scale:.8 }, { rotation:360, scale:1, duration:.6, ease:"power2.out" });
    }
}
applyTheme(isDark, false);
themeBtn.addEventListener("click", () => { isDark = !isDark; applyTheme(isDark); });
prefersDark.addEventListener("change", e => { isDark = e.matches; applyTheme(isDark, true); });

/* ---------- animations (graceful if GSAP is missing) ---------- */
const hasGSAP = typeof window.gsap !== "undefined";

if (hasGSAP) {
    gsap.set(".hero-label, .hero-title, .hero-subtitle, .hero-cta", { opacity:0, y:30 });
    const tl = gsap.timeline({ defaults:{ ease:"power4.out", duration:1.2 } });
    tl.to(".hero-label",    { opacity:1, y:0, delay:.15, duration:.8 })
      .to(".hero-title",    { opacity:1, y:0 }, "-=0.55")
      .to(".hero-subtitle", { opacity:1, y:0 }, "-=0.9")
      .to(".hero-cta",      { opacity:1, y:0 }, "-=0.9");

    const logo = document.getElementById("logo-refresh");
    if (logo) logo.addEventListener("click", (e) => {
        e.preventDefault();
        gsap.set(".hero-label, .hero-title, .hero-subtitle, .hero-cta", { opacity:0, y:30 });
        tl.restart();
        window.scrollTo({ top:0, behavior:"smooth" });
    });

    gsap.set(".connect-card", { opacity:0, y:20 });
    const co = new IntersectionObserver((entries) => {
        entries.forEach(en => {
            if (en.isIntersecting) {
                gsap.to(en.target, { opacity:1, y:0, duration:.8, ease:"power4.out" });
                co.unobserve(en.target);
            }
        });
    }, { threshold:.1 });
    document.querySelectorAll(".connect-card").forEach(el => co.observe(el));
}

/* Cards are rendered after the catalog loads, so reveal them then. */
function revealCards() {
    if (!hasGSAP) return;
    const cards = document.querySelectorAll(".card");
    gsap.set(cards, { opacity:0, y:20 });
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(en => {
            if (en.isIntersecting) {
                const el = en.target;
                gsap.to(el, { opacity:1, y:0, duration:.8, ease:"power4.out", delay:Number(el.dataset.delay) || 0 });
                obs.unobserve(el);
            }
        });
    }, { threshold:.1 });
    cards.forEach((c, i) => { c.dataset.delay = (i % 6) * 0.08; obs.observe(c); });
}
