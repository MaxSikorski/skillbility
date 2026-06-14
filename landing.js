/* ============================================================
   Skillbility landing page — theme, mobile menu, live skill
   count, scroll reveals. Degrades gracefully without GSAP.
   ============================================================ */

/* Live skill count from the registry (honest, auto-updating).
   Falls back to whatever is hard-coded in the HTML on file://. */
fetch("registry/index.json")
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(idx => {
        const el = document.getElementById("skill-count");
        if (el && idx.skill_count != null) el.textContent = idx.skill_count;
    })
    .catch(() => {});

/* ---------- theme toggle (persisted; same scheme as the store) ---------- */
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

/* ---------- mobile hamburger ---------- */
const menuToggle = document.getElementById("menu-toggle");
const navLinks   = document.getElementById("nav-links");
const menuIcon   = document.getElementById("menu-icon-path");
const hamburgerPath = "M4 6h16M4 12h16M4 18h16";
const closePath     = "M6 6l12 12M6 18L18 6";

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        const open = navLinks.classList.toggle("open");
        if (menuIcon) menuIcon.setAttribute("d", open ? closePath : hamburgerPath);
        if (open && window.gsap) {
            gsap.fromTo(".nav-links .nav-link", { opacity:0, y:20 },
                { opacity:.85, y:0, duration:.5, ease:"power4.out", stagger:.08 });
        }
    });
    navLinks.querySelectorAll(".nav-link").forEach(a => a.addEventListener("click", () => {
        navLinks.classList.remove("open");
        if (menuIcon) menuIcon.setAttribute("d", hamburgerPath);
    }));
}

/* ---------- animations (graceful if GSAP missing) ---------- */
if (typeof window.gsap !== "undefined") {
    gsap.set(".lp-hero .section-label, .lp-hero h1, .lp-hero .hero-subtitle, .lp-hero .hero-cta, .lp-stat",
        { opacity:0, y:30 });
    const tl = gsap.timeline({ defaults:{ ease:"power4.out", duration:1.2 } });
    tl.to(".lp-hero .section-label", { opacity:1, y:0, delay:.15, duration:.8 })
      .to(".lp-hero h1",            { opacity:1, y:0 }, "-=0.55")
      .to(".lp-hero .hero-subtitle",{ opacity:1, y:0 }, "-=0.9")
      .to(".lp-hero .hero-cta",     { opacity:1, y:0 }, "-=0.9")
      .to(".lp-stat",               { opacity:1, y:0 }, "-=0.95");

    const reveal = (sel) => {
        const els = document.querySelectorAll(sel);
        gsap.set(els, { opacity:0, y:24 });
        const o = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    gsap.to(en.target, { opacity:1, y:0, duration:.8, ease:"power4.out", delay:Number(en.target.dataset.d) || 0 });
                    o.unobserve(en.target);
                }
            });
        }, { threshold:.12 });
        els.forEach((el, i) => { el.dataset.d = (i % 3) * 0.08; o.observe(el); });
    };
    reveal(".lp-section .section-label");
    reveal(".lp-section h2");
    reveal(".lp-section .lp-lead");
    reveal(".step");
    reveal(".tier");
    reveal(".dev-list li");
    reveal(".newsletter-form");
}
