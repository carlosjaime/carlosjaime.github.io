/**
 * Portfolio — Carlos Jaime "Jimmy" López Martínez
 * Zero-dependency progressive enhancement layer.
 *
 * Every module is independent and fails soft: if its target nodes are missing
 * the module returns without touching the rest of the page. All motion is
 * gated behind `prefers-reduced-motion` and driven by a single rAF loop so the
 * scroll handlers never do layout work on the main thread more than once a
 * frame.
 */

'use strict';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isFinePointer = window.matchMedia('(pointer: fine)');

/** @param {string} selector @param {ParentNode} [scope] */
const $ = (selector, scope = document) => scope.querySelector(selector);
/** @param {string} selector @param {ParentNode} [scope] */
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/* ==========================================================================
   Shared animation frame scheduler
   ========================================================================== */

const frameTasks = new Set();
let frameHandle = 0;

function scheduleFrame() {
  if (frameHandle) return;
  frameHandle = requestAnimationFrame(() => {
    frameHandle = 0;
    frameTasks.forEach((task) => task());
  });
}

/** Register a callback executed at most once per animation frame. */
function onFrame(task) {
  frameTasks.add(task);
  return () => frameTasks.delete(task);
}

/* ==========================================================================
   Navigation: sticky state, mobile drawer, scroll spy
   ========================================================================== */

function initNavigation() {
  const nav = $('[data-nav]');
  const toggle = $('[data-nav-toggle]');
  const drawer = $('[data-nav-drawer]');
  if (!nav) return;

  const setStuck = () => nav.classList.toggle('is-stuck', window.scrollY > 24);
  setStuck();
  window.addEventListener('scroll', () => { onFrame(setStuck); scheduleFrame(); }, { passive: true });

  if (toggle && drawer) {
    const closeDrawer = () => {
      if (drawer.hidden) return;
      drawer.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
    };

    const openDrawer = () => {
      drawer.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
    };

    toggle.addEventListener('click', () => {
      drawer.hidden ? openDrawer() : closeDrawer();
    });

    drawer.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeDrawer();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 900) closeDrawer();
    });
  }

  // Scroll spy: highlight the nav entry whose section owns the viewport centre.
  const links = $$('[data-nav-link]');
  const sections = links
    .map((link) => {
      const id = link.getAttribute('href');
      return id && id.startsWith('#') ? document.getElementById(id.slice(1)) : null;
    })
    .filter(Boolean);

  if (!sections.length || !('IntersectionObserver' in window)) return;

  const visible = new Map();
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => visible.set(entry.target.id, entry.intersectionRatio));
      let bestId = null;
      let bestRatio = 0;
      visible.forEach((ratio, id) => {
        if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
      });
      links.forEach((link) => {
        const active = bestRatio > 0 && link.getAttribute('href') === `#${bestId}`;
        active ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current');
      });
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
  );

  sections.forEach((section) => spy.observe(section));
}

/* ==========================================================================
   Scroll progress bar
   ========================================================================== */

function initScrollProgress() {
  const bar = $('[data-scroll-progress]');
  if (!bar) return;

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0;
    bar.style.setProperty('--progress', ratio.toFixed(4));
  };

  update();
  window.addEventListener('scroll', () => { onFrame(update); scheduleFrame(); }, { passive: true });
  window.addEventListener('resize', update, { passive: true });
}

/* ==========================================================================
   Reveal on scroll (staggered)
   ========================================================================== */

function initReveal() {
  const targets = $$('[data-reveal]');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window) || prefersReducedMotion.matches) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );

  // Stagger siblings that share a parent so grids cascade instead of popping.
  const groups = new Map();
  targets.forEach((el) => {
    const parent = el.parentElement;
    const list = groups.get(parent) || [];
    list.push(el);
    groups.set(parent, list);
  });

  groups.forEach((list) => {
    list.forEach((el, index) => {
      if (!el.style.getPropertyValue('--reveal-delay')) {
        el.style.setProperty('--reveal-delay', `${Math.min(index, 8) * 70}ms`);
      }
      observer.observe(el);
    });
  });
}

/* ==========================================================================
   Parallax — scroll depth + pointer tilt on the hero
   ========================================================================== */

function initParallax() {
  if (prefersReducedMotion.matches) return;

  const layers = $$('[data-parallax]').map((el) => ({
    el,
    speed: Number.parseFloat(el.dataset.parallax) || 0.1,
    axis: el.dataset.parallaxAxis || 'y',
  }));

  const tilters = $$('[data-tilt]').map((el) => ({
    el,
    strength: Number.parseFloat(el.dataset.tilt) || 10,
  }));

  if (!layers.length && !tilters.length) return;

  let scrollY = window.scrollY;
  let pointerX = 0;
  let pointerY = 0;
  let renderedX = 0;
  let renderedY = 0;

  const render = () => {
    // Ease the pointer towards its target for a weighted, non-jittery feel.
    renderedX += (pointerX - renderedX) * 0.08;
    renderedY += (pointerY - renderedY) * 0.08;

    layers.forEach(({ el, speed, axis }) => {
      const offset = scrollY * speed;
      el.style.transform = axis === 'x'
        ? `translate3d(${offset.toFixed(2)}px, 0, 0)`
        : `translate3d(${(renderedX * speed * 40).toFixed(2)}px, ${offset.toFixed(2)}px, 0)`;
    });

    tilters.forEach(({ el, strength }) => {
      const rotateY = renderedX * strength;
      const rotateX = -renderedY * strength;
      el.style.transform =
        `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(${(renderedX * 12).toFixed(2)}px, ${(renderedY * 12).toFixed(2)}px, 0)`;
    });

    // Keep easing while the pointer is still settling.
    if (Math.abs(pointerX - renderedX) > 0.001 || Math.abs(pointerY - renderedY) > 0.001) {
      onFrame(render);
      scheduleFrame();
    }
  };

  const queueRender = () => { onFrame(render); scheduleFrame(); };

  window.addEventListener('scroll', () => { scrollY = window.scrollY; queueRender(); }, { passive: true });

  if (isFinePointer.matches) {
    window.addEventListener('pointermove', (event) => {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
      queueRender();
    }, { passive: true });
  }

  queueRender();
}

/* ==========================================================================
   Hero role typewriter
   ========================================================================== */

function initTypewriter() {
  const host = $('[data-typewriter]');
  if (!host) return;

  let roles = [];
  try {
    roles = JSON.parse(host.dataset.typewriter);
  } catch {
    roles = [];
  }
  if (!Array.isArray(roles) || !roles.length) return;

  if (prefersReducedMotion.matches) {
    host.textContent = roles[0];
    return;
  }

  const TYPE_MS = 55;
  const ERASE_MS = 28;
  const HOLD_MS = 1900;

  let roleIndex = 0;
  let charIndex = 0;
  let erasing = false;
  let timer = 0;

  const tick = () => {
    const role = roles[roleIndex];
    charIndex += erasing ? -1 : 1;
    host.textContent = role.slice(0, charIndex);

    let delay = erasing ? ERASE_MS : TYPE_MS;

    if (!erasing && charIndex === role.length) {
      erasing = true;
      delay = HOLD_MS;
    } else if (erasing && charIndex === 0) {
      erasing = false;
      roleIndex = (roleIndex + 1) % roles.length;
      delay = 320;
    }

    timer = window.setTimeout(tick, delay);
  };

  tick();

  // Stop burning timers while the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearTimeout(timer);
    } else {
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, 400);
    }
  });
}

/* ==========================================================================
   Animated counters
   ========================================================================== */

function initCounters() {
  const counters = $$('[data-count-to]');
  if (!counters.length) return;

  const run = (el) => {
    const target = Number.parseFloat(el.dataset.countTo);
    if (Number.isNaN(target)) return;
    const suffix = el.dataset.countSuffix || '';

    if (prefersReducedMotion.matches) {
      el.textContent = `${target}${suffix}`;
      return;
    }

    const duration = 1400;
    const start = performance.now();

    const step = (now) => {
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(run);
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* ==========================================================================
   Pointer spotlight on cards (delegated, fine pointers only)
   ========================================================================== */

function initSpotlight() {
  if (!isFinePointer.matches || prefersReducedMotion.matches) return;

  document.addEventListener('pointermove', (event) => {
    const card = event.target.closest('.card, .project, .tl-item__body');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }, { passive: true });
}

/* ==========================================================================
   Project filtering
   ========================================================================== */

function initFilters() {
  const bar = $('[data-filters]');
  const grid = $('[data-projects]');
  if (!bar || !grid) return;

  const buttons = $$('[data-filter]', bar);
  const cards = $$('[data-tags]', grid);
  const empty = $('[data-projects-empty]');

  const apply = (value) => {
    let matches = 0;

    cards.forEach((card) => {
      const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
      const show = value === 'all' || tags.includes(value);
      if (show) matches += 1;
      card.classList.toggle('is-filtered-out', !show);
      // Delay display:none so the fade-out can play.
      window.setTimeout(() => { card.hidden = !show; }, show ? 0 : 200);
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
   Project dialogs (native <dialog> with focus restoration)
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

    const closer = event.target.closest('[data-dialog-close]');
    if (closer) {
      const dialog = closer.closest('dialog');
      if (dialog) dialog.close();
    }
  });

  dialogs.forEach((dialog) => {
    // Click on the backdrop area (outside the inner panel) closes the dialog.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('is-locked');
    });
  });
}

/* ==========================================================================
   Seamless marquee — duplicate the track so the -50% loop has no seam
   ========================================================================== */

function initMarquee() {
  $$('[data-marquee]').forEach((track) => {
    if (prefersReducedMotion.matches) return;
    track.append(...Array.from(track.children).map((child) => {
      const clone = child.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      return clone;
    }));
  });
}

/* ==========================================================================
   Back to top
   ========================================================================== */

function initBackToTop() {
  const button = $('[data-to-top]');
  if (!button) return;

  const update = () => button.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
  update();
  window.addEventListener('scroll', () => { onFrame(update); scheduleFrame(); }, { passive: true });

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
  });
}

/* ==========================================================================
   Contact form — client-side validation, then hand off to the mail client.
   The site is fully static (GitHub Pages), so there is no server to POST to;
   composing a pre-filled message is the honest, dependency-free option.
   ========================================================================== */

function initContactForm() {
  const form = $('[data-contact-form]');
  if (!form) return;

  const status = $('[data-form-status]', form);
  const recipient = form.dataset.recipient;

  const fieldError = (input) => $(`[data-error-for="${input.id}"]`, form);

  const validate = (input) => {
    const error = fieldError(input);
    const valid = input.checkValidity();
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

    const inputs = $$('input[required], textarea[required]', form);
    const allValid = inputs.map(validate).every(Boolean);

    if (!allValid) {
      if (status) status.textContent = '';
      const firstInvalid = inputs.find((input) => input.getAttribute('aria-invalid') === 'true');
      firstInvalid?.focus();
      return;
    }

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const company = String(data.get('company') || '').trim();
    const message = String(data.get('message') || '').trim();
    const email = String(data.get('email') || '').trim();

    const subject = `Nuevo contacto desde el portafolio — ${name}`;
    const body = [
      `Nombre: ${name}`,
      `Email: ${email}`,
      company ? `Empresa / proyecto: ${company}` : null,
      '',
      message,
    ].filter((line) => line !== null).join('\n');

    window.location.href =
      `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (status) {
      status.textContent = 'Abriendo tu cliente de correo con el mensaje listo para enviar…';
    }
  });
}

/* ==========================================================================
   Copy-to-clipboard affordances
   ========================================================================== */

function initCopyButtons() {
  $$('[data-copy]').forEach((button) => {
    const original = button.dataset.copyLabel || button.textContent.trim();

    button.addEventListener('click', async () => {
      const value = button.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = '¡Copiado!';
      } catch {
        button.textContent = value;
      }
      window.setTimeout(() => { button.textContent = original; }, 1800);
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
    initNavigation,
    initScrollProgress,
    initReveal,
    initParallax,
    initTypewriter,
    initCounters,
    initSpotlight,
    initFilters,
    initDialogs,
    initMarquee,
    initBackToTop,
    initContactForm,
    initCopyButtons,
    initYear,
  ].forEach((module) => {
    try {
      module();
    } catch (error) {
      console.error(`[portfolio] ${module.name} failed to initialise`, error);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
