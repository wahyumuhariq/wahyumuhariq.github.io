const M = window.Motion;
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const run = Boolean(M) && !reduce;
const ease = [0.22, 1, 0.36, 1];
const spring = { type: "spring", stiffness: 380, damping: 32 };
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

if (M) root.classList.add("motion");

$("[data-year]").textContent = new Date().getFullYear();

/* Masa kerja dihitung dari bulan mulai (bulan berjalan ikut dihitung) */
$$("[data-since]").forEach((el) => {
  const [y, m] = el.dataset.since.split("-").map(Number);
  const now = new Date();
  const months = (now.getFullYear() - y) * 12 + now.getMonth() + 2 - m;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  el.textContent = [years && `${years} tahun`, rest && `${rest} bulan`].filter(Boolean).join(" ");
});

/* Tema */
$(".theme-toggle").addEventListener("click", () => {
  const dark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try {
    localStorage.setItem("theme", root.dataset.theme);
  } catch (e) {}
});

/* Nav: bayangan, progres baca, penanda section aktif */
const nav = $(".nav");
const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

if (M) {
  const bar = $(".progress");
  M.scroll((p) => (bar.style.transform = `scaleX(${p})`));
}

const pill = $(".nav-pill");
const links = $$(".nav-links a");
let active = null;

function movePill(link) {
  if (!link) {
    pill.style.opacity = 0;
    return;
  }
  const visible = pill.style.opacity === "1";
  pill.style.opacity = 1;
  if (run && visible) {
    M.animate(pill, { x: link.offsetLeft, width: `${link.offsetWidth}px` }, spring);
  } else {
    pill.style.transform = `translateX(${link.offsetLeft}px)`;
    pill.style.width = `${link.offsetWidth}px`;
  }
}

links.forEach((a) => {
  a.addEventListener("pointerenter", () => movePill(a));
  a.addEventListener("pointerleave", () => movePill(active));
});

const sections = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      active = links.find((a) => a.hash === `#${e.target.id}`) || null;
      links.forEach((a) => a.classList.toggle("is-active", a === active));
      movePill(active);
    }
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
$$("main > section").forEach((s) => sections.observe(s));

/* Intro hero */
const name = $(".hero-name");
name.innerHTML = name.textContent
  .trim()
  .split(/\s+/)
  .map((w) => `<span class="word">${w}</span>`)
  .join(" ");

if (run) {
  name.style.opacity = 1;
  M.animate($$(".word", name), { opacity: [0, 1], y: [28, 0] }, { duration: 0.8, ease, delay: M.stagger(0.09) });
  M.animate(
    $$(".hero-text .intro:not(.hero-name)"),
    { opacity: [0, 1], y: [14, 0] },
    { duration: 0.6, ease, delay: M.stagger(0.07, { startDelay: 0.25 }) }
  );
  M.animate(".hero-photo", { opacity: [0, 1], scale: [0.96, 1] }, { duration: 0.9, ease, delay: 0.1 });

  /* Muncul saat discroll */
  $$(".reveal").forEach((el) => {
    const siblings = $$(":scope > .reveal", el.parentElement);
    const delay = (siblings.indexOf(el) % 4) * 0.07;
    M.inView(el, () => M.animate(el, { opacity: [0, 1], y: [22, 0] }, { duration: 0.65, ease, delay }), {
      amount: 0.15,
    });
  });
}

/* Garis timeline mengikuti scroll */
const fill = $(".timeline-fill");
if (run) {
  M.scroll((p) => (fill.style.transform = `scaleY(${p})`), {
    target: $(".timeline"),
    offset: ["start 75%", "end 60%"],
  });
} else {
  fill.style.transform = "scaleY(1)";
}

/* Accordion tugas */
$$(".duty").forEach((btn, i) => {
  const panel = btn.nextElementSibling;
  panel.id = `duty-${i}`;
  panel.hidden = true;
  btn.setAttribute("aria-controls", panel.id);

  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(open));
    panel.anim?.stop();

    if (!run) {
      panel.hidden = !open;
      return;
    }
    if (open) {
      panel.hidden = false;
      panel.anim = M.animate(
        panel,
        { height: [0, `${panel.scrollHeight}px`], opacity: [0, 1] },
        { duration: 0.35, ease }
      );
      panel.anim.then(() => (panel.style.height = ""));
    } else {
      panel.anim = M.animate(panel, { height: `0px`, opacity: 0 }, { duration: 0.25, ease });
      panel.anim.then(() => {
        if (btn.getAttribute("aria-expanded") === "false") panel.hidden = true;
        panel.style.height = "";
      });
    }
  });
});

/* Fokus posisi: ringkasan, urutan & sorotan keahlian */
const ORDER = {
  pajak: ["tax", "djp", "erp", "office", "code"],
  programmer: ["code", "erp", "office", "tax", "djp"],
};
const segmented = $(".segmented");
const thumb = $(".segmented-thumb");
const focusBtns = $$("[data-focus-btn]");
const skillGrid = $(".skills");
let focus = new URLSearchParams(location.search).get("fokus") === "programmer" ? "programmer" : "pajak";

function placeThumb(animated) {
  const btn = $(`[data-focus-btn="${focus}"]`, segmented);
  const to = { x: btn.offsetLeft, width: `${btn.offsetWidth}px` };
  if (animated && run) M.animate(thumb, to, spring);
  else {
    thumb.style.transform = `translateX(${to.x}px)`;
    thumb.style.width = to.width;
  }
}

function setFocus(mode, animated) {
  focus = mode;
  focusBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.focusBtn === mode)));
  placeThumb(animated);

  $$("[data-summary]").forEach((p) => {
    const show = p.dataset.summary === mode;
    if (show && p.hidden && animated && run) M.animate(p, { opacity: [0, 1], y: [8, 0] }, { duration: 0.4, ease });
    p.hidden = !show;
  });

  const cards = $$(".skill", skillGrid);
  const before = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
  ORDER[mode].forEach((key) => skillGrid.append($(`[data-key="${key}"]`, skillGrid)));
  cards.forEach((c) => {
    const match = c.dataset.for.split(" ").includes(mode);
    c.classList.toggle("is-match", match);
    c.classList.toggle("is-muted", !match);
  });
  if (!animated || !run) return;
  cards.forEach((c) => {
    const a = before.get(c);
    const b = c.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    if (dx || dy) M.animate(c, { x: [dx, 0], y: [dy, 0] }, { type: "spring", stiffness: 260, damping: 30 });
  });
}

focusBtns.forEach((b) =>
  b.addEventListener("click", () => {
    if (b.dataset.focusBtn === focus) return;
    setFocus(b.dataset.focusBtn, true);
    const url = new URL(location.href);
    if (focus === "programmer") url.searchParams.set("fokus", "programmer");
    else url.searchParams.delete("fokus");
    history.replaceState(null, "", url);
  })
);

setFocus(focus, false);
document.fonts?.ready.then(() => {
  placeThumb(false);
  movePill(active);
});
addEventListener("resize", () => {
  placeThumb(false);
  movePill(active);
});

/* Interaksi pointer: spotlight, tilt foto, tombol magnetis */
if (fine) {
  $$(".spotlight").forEach((el) =>
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    })
  );
}

if (fine && run) {
  const photo = $(".hero-photo");
  photo.addEventListener("pointermove", (e) => {
    const r = photo.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    M.animate(photo, { rotateY: px * 8, rotateX: py * -8, transformPerspective: 900 }, { duration: 0.4, ease });
  });
  photo.addEventListener("pointerleave", () => M.animate(photo, { rotateY: 0, rotateX: 0 }, spring));

  $$(".magnetic").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.2;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      M.animate(btn, { x, y }, spring);
    });
    btn.addEventListener("pointerleave", () => M.animate(btn, { x: 0, y: 0 }, spring));
  });
}

/* Salin email */
const toastEl = $(".toast");
let toastTimer;

function toast(msg) {
  toastEl.textContent = msg;
  clearTimeout(toastTimer);
  if (run) M.animate(toastEl, { opacity: 1, y: [12, 0] }, { duration: 0.3, ease });
  else toastEl.style.cssText = "opacity:1;transform:none";
  toastTimer = setTimeout(() => {
    if (run) M.animate(toastEl, { opacity: 0, y: 12 }, { duration: 0.3, ease });
    else toastEl.style.cssText = "";
  }, 2200);
}

$(".copy-email").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  try {
    await navigator.clipboard.writeText(btn.dataset.email);
    toast("Email disalin ke clipboard");
    btn.querySelector("i").className = "fa-solid fa-check";
    btn.querySelector("span").textContent = "Disalin";
    setTimeout(() => {
      btn.querySelector("i").className = "fa-solid fa-copy";
      btn.querySelector("span").textContent = "Salin";
    }, 2200);
  } catch (err) {
    location.href = `mailto:${btn.dataset.email}`;
  }
});
