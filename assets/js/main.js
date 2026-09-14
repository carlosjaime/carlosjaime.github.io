/**
 * Portfolio — Carlos Jaime "Jimmy" López Martínez
 *
 * Zero-dependency progressive enhancement.
 *
 * Contract every module follows:
 *  - it queries its own nodes and returns early when they are absent;
 *  - it never throws into the boot sequence (boot() isolates each one);
 *  - anything animated per-frame registers with the shared rAF scheduler
 *    instead of owning its own loop, so scroll never schedules more than one
 *    frame of work;
 *  - anything decorative checks `prefers-reduced-motion` first.
 */

'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');

const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (from, to, t) => from + (to - from) * t;

/* ==========================================================================
   Shared frame loop
   --------------------------------------------------------------------------
   Two kinds of work: `once` tasks drain on the next frame (scroll handlers
   that only need to sync state), `always` tasks run every frame while at
   least one exists (easing loops).
   ========================================================================== */

const onceTasks = new Set();
const alwaysTasks = new Set();
let running = false;

function tick() {
  const queued = Array.from(onceTasks);
  onceTasks.clear();
  queued.forEach((task) => task());
  alwaysTasks.forEach((task) => task());

  if (onceTasks.size || alwaysTasks.size) {
    requestAnimationFrame(tick);
  } else {
    running = false;
  }
}

function kick() {
  if (running) return;
  running = true;
  requestAnimationFrame(tick);
}

/** Run `task` on the next animation frame (deduplicated). */
function nextFrame(task) { onceTasks.add(task); kick(); }

/** Run `task` on every animation frame until the returned function is called. */
function everyFrame(task) {
  alwaysTasks.add(task);
  kick();
  return () => alwaysTasks.delete(task);
}

/** Attach a passive scroll listener that syncs once per frame. */
function onScroll(task) {
  task();
  window.addEventListener('scroll', () => nextFrame(task), { passive: true });
}

/* ==========================================================================
   Intro curtain
   ========================================================================== */

function initIntro() {
  const intro = $('[data-intro]');
  if (!intro) return;

  if (reduceMotion.matches) {
    intro.remove();
    return;
  }

  const dismiss = () => {
    intro.classList.add('is-done');
    window.setTimeout(() => intro.remove(), 900);
  };

  window.setTimeout(dismiss, 1400);
  // Any deliberate input skips the curtain immediately.
  ['pointerdown', 'keydown', 'wheel'].forEach((type) =>
    window.addEventListener(type, dismiss, { once: true, passive: true })
  );
}

/* ==========================================================================
   Text splitting — wrap each word so it can be masked and staggered
   ========================================================================== */

function splitWords(el) {
  if (el.dataset.split === 'done') return;

  const label = el.textContent.trim().replace(/\s+/g, ' ');
  let index = 0;

  // Walks the subtree so inline markup (the italic <em> accents) survives:
  // text nodes become masked words, element nodes are cloned shallow and
  // repopulated with their own split children.
  const walk = (node) => {
    const fragment = document.createDocumentFragment();

    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { fragment.append(document.createTextNode(' ')); return; }

          const outer = document.createElement('span');
          outer.className = 'word';
          outer.style.setProperty('--wi', String(index++));

          const inner = document.createElement('span');
          inner.textContent = part;

          outer.append(inner);
          fragment.append(outer);
        });
        return;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        const clone = child.cloneNode(false);
        clone.append(walk(child));
        fragment.append(clone);
      }
    });

    return fragment;
  };

  const split = walk(el);
  // Keep a clean accessible name; the split spans are presentational.
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', label);
  el.replaceChildren(split);
  el.dataset.split = 'done';
}

function initSplitText() {
  const targets = $$('[data-split]');
  if (!targets.length || reduceMotion.matches) return;
  targets.forEach(splitWords);
}

/* ==========================================================================
   Reveal on scroll
   ========================================================================== */

function initReveal() {
  const targets = $$('[data-reveal], [data-reveal-media], [data-split], .rule');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  // Siblings sharing a parent cascade rather than popping in together.
  const groups = new Map();
  targets.forEach((el) => {
    const list = groups.get(el.parentElement) || [];
    list.push(el);
    groups.set(el.parentElement, list);
  });

  groups.forEach((list) => {
    list.forEach((el, index) => {
      if (list.length > 1 && !el.style.getPropertyValue('--reveal-delay')) {
        el.style.setProperty('--reveal-delay', `${Math.min(index, 9) * 65}ms`);
      }
    });
  });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ==========================================================================
   Navigation
   ========================================================================== */

function initNavigation() {
  const nav = $('[data-nav]');
  if (!nav) return;

  const toggle = $('[data-nav-toggle]');
  const drawer = $('[data-nav-drawer]');

  let lastY = window.scrollY;

  onScroll(() => {
    const y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 24);
    // Only retract once past the hero, and never while the drawer is open.
    const retract = y > 420 && y > lastY && (!drawer || drawer.hidden);
    nav.classList.toggle('is-hidden', retract);
    lastY = y;
  });

  if (toggle && drawer) {
    const close = () => {
      if (drawer.hidden) return;
      drawer.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menú');
      document.body.classList.remove('is-locked');
      toggle.focus({ preventScroll: true });
    };

    const open = () => {
      drawer.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Cerrar menú');
      document.body.classList.add('is-locked');
      nav.classList.remove('is-hidden');
      $('a', drawer)?.focus({ preventScroll: true });
    };

    toggle.addEventListener('click', () => (drawer.hidden ? open() : close()));
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 940) close(); });
  }

  // Scroll spy
  const links = $$('[data-nav-link]');
  const sections = links
    .map((link) => document.getElementById((link.getAttribute('href') || '').slice(1)))
    .filter(Boolean);

  if (!sections.length || !('IntersectionObserver' in window)) return;

  const ratios = new Map();
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => ratios.set(entry.target.id, entry.intersectionRatio));
      let bestId = null;
      let best = 0;
      ratios.forEach((ratio, id) => { if (ratio > best) { best = ratio; bestId = id; } });
      links.forEach((link) => {
        const active = best > 0 && link.getAttribute('href') === `#${bestId}`;
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    },
    { rootMargin: '-48% 0px -48% 0px', threshold: [0, 0.2, 0.5, 1] }
  );

  sections.forEach((section) => spy.observe(section));
}

/* ==========================================================================
   Scroll progress
   ========================================================================== */

function initScrollProgress() {
  const bar = $('[data-scroll-progress]');
  if (!bar) return;

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty('--progress', scrollable > 0 ? (window.scrollY / scrollable).toFixed(4) : '0');
  };

  onScroll(update);
  window.addEventListener('resize', update, { passive: true });
}

/* ==========================================================================
   Parallax — scroll depth plus a weighted pointer drift
   ========================================================================== */

function initParallax() {
  if (reduceMotion.matches) return;

  const layers = $$('[data-parallax]').map((el) => ({
    el,
    speed: Number.parseFloat(el.dataset.parallax) || 0.1,
    drift: Number.parseFloat(el.dataset.parallaxDrift || '0'),
  }));
  if (!layers.length) return;

  let scrollY = window.scrollY;
  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;
  let settling = false;

  const paint = () => {
    x = lerp(x, targetX, 0.07);
    y = lerp(y, targetY, 0.07);

    layers.forEach(({ el, speed, drift }) => {
      el.style.transform =
        `translate3d(${(x * drift).toFixed(2)}px, ${(scrollY * speed + y * drift * 0.6).toFixed(2)}px, 0)`;
    });

    const settled = Math.abs(targetX - x) < 0.05 && Math.abs(targetY - y) < 0.05;
    if (settled && settling) { stop(); settling = false; }
  };

  let stop = () => {};
  const start = () => {
    if (settling) return;
    settling = true;
    stop = everyFrame(paint);
  };

  window.addEventListener('scroll', () => { scrollY = window.scrollY; nextFrame(paint); }, { passive: true });

  if (finePointer.matches) {
    window.addEventListener('pointermove', (event) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
      start();
    }, { passive: true });
  }

  nextFrame(paint);
}

/* ==========================================================================
   Custom cursor
   ========================================================================== */

function initCursor() {
  if (!finePointer.matches || reduceMotion.matches) return;

  const cursor = $('[data-cursor]');
  if (!cursor) return;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let x = targetX;
  let y = targetY;
  let stop = () => {};
  let looping = false;

  const paint = () => {
    x = lerp(x, targetX, 0.18);
    y = lerp(y, targetY, 0.18);
    cursor.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;

    if (Math.abs(targetX - x) < 0.1 && Math.abs(targetY - y) < 0.1) {
      stop();
      looping = false;
    }
  };

  const HOVER_TARGETS = 'a, button, [role="button"], input, textarea, .project, .card';

  window.addEventListener('pointermove', (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    cursor.classList.add('is-active');
    cursor.classList.toggle('is-hovering', Boolean(event.target.closest(HOVER_TARGETS)));
    if (!looping) { looping = true; stop = everyFrame(paint); }
  }, { passive: true });

  document.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
}

/* ==========================================================================
   Magnetic hover
   ========================================================================== */

function initMagnetic() {
  if (!finePointer.matches || reduceMotion.matches) return;

  $$('[data-magnetic]').forEach((el) => {
    const strength = Number.parseFloat(el.dataset.magnetic) || 0.28;

    const move = (event) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate3d(${(dx * strength).toFixed(2)}px, ${(dy * strength).toFixed(2)}px, 0)`;
    };

    const reset = () => { el.style.transform = ''; };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
    el.addEventListener('blur', reset);
  });
}

/* ==========================================================================
   Velocity-aware marquee
   ========================================================================== */

function initMarquee() {
  const track = $('[data-marquee]');
  if (!track) return;

  // Duplicate the items so the loop has no visible seam.
  const originals = Array.from(track.children);
  track.append(...originals.map((node) => {
    const clone = node.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    return clone;
  }));

  if (reduceMotion.matches) return;

  const half = () => track.scrollWidth / 2;
  let offset = 0;
  let velocity = 0;
  let lastY = window.scrollY;

  window.addEventListener('scroll', () => {
    velocity = clamp((window.scrollY - lastY) * 0.35, -28, 28);
    lastY = window.scrollY;
  }, { passive: true });

  const paint = () => {
    velocity *= 0.92;
    offset -= 0.45 + velocity;

    const width = half();
    if (width > 0) {
      if (offset <= -width) offset += width;
      if (offset > 0) offset -= width;
    }

    track.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`;
  };

  // An always-on rAF loop costs battery for something nobody can see, so the
  // ticker only runs while it is on screen and the tab is in the foreground.
  let stop = null;
  let onScreen = true;

  const sync = () => {
    const shouldRun = onScreen && !document.hidden;
    if (shouldRun && !stop) stop = everyFrame(paint);
    else if (!shouldRun && stop) { stop(); stop = null; }
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    }).observe(track.parentElement || track);
  }

  document.addEventListener('visibilitychange', sync);
  sync();
}

/* ==========================================================================
   Hero role typewriter
   ========================================================================== */

function initTypewriter() {
  const host = $('[data-typewriter]');
  if (!host) return;

  let roles = [];
  try { roles = JSON.parse(host.dataset.typewriter); } catch { roles = []; }
  if (!Array.isArray(roles) || !roles.length) return;

  if (reduceMotion.matches) {
    host.textContent = roles[0];
    return;
  }

  const TYPE = 52;
  const ERASE = 26;
  const HOLD = 2000;

  let roleIndex = 0;
  let chars = 0;
  let erasing = false;
  let timer = 0;

  const tick = () => {
    const role = roles[roleIndex];
    chars += erasing ? -1 : 1;
    host.textContent = role.slice(0, chars);

    let delay = erasing ? ERASE : TYPE;
    if (!erasing && chars === role.length) { erasing = true; delay = HOLD; }
    else if (erasing && chars === 0) {
      erasing = false;
      roleIndex = (roleIndex + 1) % roles.length;
      delay = 300;
    }

    timer = window.setTimeout(tick, delay);
  };

  tick();

  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(timer);
    if (!document.hidden) timer = window.setTimeout(tick, 400);
  });
}

/* ==========================================================================
   Counters
   ========================================================================== */

function initCounters() {
  const counters = $$('[data-count-to]');
  if (!counters.length) return;

  const run = (el) => {
    const target = Number.parseFloat(el.dataset.countTo);
    if (Number.isNaN(target)) return;

    if (reduceMotion.matches) { el.textContent = String(target); return; }

    const duration = 1500;
    const start = performance.now();

    const step = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) { counters.forEach(run); return; }

  const observer = new IntersectionObserver(
    (entries, obs) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      run(entry.target);
      obs.unobserve(entry.target);
    }),
    { threshold: 0.6 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* ==========================================================================
   Pointer spotlight on cards
   ========================================================================== */

function initSpotlight() {
  if (!finePointer.matches || reduceMotion.matches) return;

  document.addEventListener('pointermove', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }, { passive: true });
}

/* ==========================================================================
   Project filters
   ========================================================================== */

function initFilters() {
  const bar = $('[data-filters]');
  const grid = $('[data-projects]');
  if (!bar || !grid) return;

  const buttons = $$('[data-filter]', bar);
  const cards = $$('[data-tags]', grid);
  const empty = $('[data-projects-empty]');
  const timers = new WeakMap();

  // Label each filter with how many projects it holds.
  buttons.forEach((button) => {
    const value = button.dataset.filter;
    const count = value === 'all'
      ? cards.length
      : cards.filter((card) => (card.dataset.tags || '').split(/\s+/).includes(value)).length;
    const slot = $('[data-filter-count]', button);
    if (slot) slot.textContent = String(count).padStart(2, '0');
  });

  const apply = (value) => {
    let matches = 0;

    cards.forEach((card) => {
      const show = value === 'all' || (card.dataset.tags || '').split(/\s+/).includes(value);
      if (show) matches += 1;

      card.classList.toggle('is-filtered-out', !show);
      window.clearTimeout(timers.get(card));

      if (show) {
        card.hidden = false;
      } else {
        // Let the fade finish before the card leaves the grid flow.
        timers.set(card, window.setTimeout(() => { card.hidden = true; }, reduceMotion.matches ? 0 : 260));
      }
    });

    if (empty) empty.hidden = matches > 0;
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      apply(button.dataset.filter);
    });
  });
}

/* ==========================================================================
   Project dialogs
   ========================================================================== */

function initDialogs() {
  const dialogs = $$('dialog[data-dialog]');
  if (!dialogs.length) return;

  const supportsModal = typeof HTMLDialogElement !== 'undefined'
    && typeof HTMLDialogElement.prototype.showModal === 'function';

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-dialog-open]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.dialogOpen);
      if (!dialog) return;
      event.preventDefault();
      if (supportsModal) {
        dialog.showModal();
        document.body.classList.add('is-locked');
      } else {
        dialog.setAttribute('open', '');
      }
      return;
    }

    if (event.target.closest('[data-dialog-close]')) {
      event.target.closest('dialog')?.close();
    }
  });

  dialogs.forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      // Only a click on the backdrop itself dismisses the sheet.
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => document.body.classList.remove('is-locked'));
  });
}

/* ==========================================================================
   Back to top
   ========================================================================== */

function initBackToTop() {
  const button = $('[data-to-top]');
  if (!button) return;

  onScroll(() => button.classList.toggle('is-visible', window.scrollY > window.innerHeight));

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
}

/* ==========================================================================
   Contact form
   --------------------------------------------------------------------------
   The site is static (GitHub Pages), so there is no endpoint to POST to:
   validate here, then hand a fully composed message to the mail client.
   ========================================================================== */

function initContactForm() {
  const form = $('[data-contact-form]');
  if (!form) return;

  const status = $('[data-form-status]', form);
  const recipient = form.dataset.recipient;

  const validate = (input) => {
    const valid = input.checkValidity();
    const error = $(`[data-error-for="${input.id}"]`, form);
    input.setAttribute('aria-invalid', String(!valid));
    if (error) error.textContent = valid ? '' : input.dataset.errorMessage || 'Campo requerido.';
    return valid;
  };

  $$('input, textarea', form).forEach((input) => {
    input.addEventListener('blur', () => validate(input));
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validate(input);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const required = $$('input[required], textarea[required]', form);
    if (!required.map(validate).every(Boolean)) {
      if (status) status.textContent = '';
      required.find((input) => input.getAttribute('aria-invalid') === 'true')?.focus();
      return;
    }

    const data = new FormData(form);
    const read = (key) => String(data.get(key) || '').trim();

    const lines = [`Nombre: ${read('name')}`, `Email: ${read('email')}`];
    if (read('company')) lines.push(`Empresa / proyecto: ${read('company')}`);
    lines.push('', read('message'));
    const body = lines.join('\n');

    window.location.href = `mailto:${recipient}`
      + `?subject=${encodeURIComponent(`Nuevo contacto desde el portafolio — ${read('name')}`)}`
      + `&body=${encodeURIComponent(body)}`;

    if (status) status.textContent = 'Abriendo tu cliente de correo con el mensaje listo para enviar…';
  });
}

/* ==========================================================================
   Copy to clipboard
   ========================================================================== */

function initCopy() {
  $$('[data-copy]').forEach((button) => {
    const label = $('[data-copy-label]', button) || button;
    const original = label.textContent;

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        label.textContent = 'Copiado';
      } catch {
        label.textContent = button.dataset.copy;
      }
      window.setTimeout(() => { label.textContent = original; }, 1800);
    });
  });
}

/* ==========================================================================
   Footer year
   ========================================================================== */

function initYear() {
  const node = $('[data-year]');
  if (node) node.textContent = String(new Date().getFullYear());
}

/* ==========================================================================
   Boot
   ========================================================================== */

function boot() {
  [
    initIntro,
    initSplitText,
    initReveal,
    initNavigation,
    initScrollProgress,
    initParallax,
    initCursor,
    initMagnetic,
    initMarquee,
    initTypewriter,
    initCounters,
    initSpotlight,
    initFilters,
    initDialogs,
    initBackToTop,
    initContactForm,
    initCopy,
    initYear,
  ].forEach((module) => {
    try { module(); } catch (error) { console.error(`[portfolio] ${module.name}`, error); }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
