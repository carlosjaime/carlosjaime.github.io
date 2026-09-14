/**
 * Portfolio — Carlos Jaime "Jimmy" López Martínez
 *
 * Zero-dependency progressive enhancement.
 *
 * Contract every module follows:
 *  - it queries its own nodes and returns early when they are absent;
 *  - it never throws into the boot sequence (boot() isolates each one);
 *  - anything animated per-frame registers with the shared rAF scheduler
 *    instead of owning its own loop;
 *  - anything decorative checks `prefers-reduced-motion` first.
 */

'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');

const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (from, to, t) => from + (to - from) * t;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

/* ==========================================================================
   Shared frame loop
   --------------------------------------------------------------------------
   `once` tasks drain on the next frame (scroll handlers that only sync
   state); `always` tasks run every frame while at least one is registered
   (easing loops). The loop stops itself when nothing is left.
   ========================================================================== */

const onceTasks = new Set();
const alwaysTasks = new Set();
let running = false;

function tick() {
  const queued = Array.from(onceTasks);
  onceTasks.clear();
  queued.forEach((task) => task());
  alwaysTasks.forEach((task) => task());

  if (onceTasks.size || alwaysTasks.size) requestAnimationFrame(tick);
  else running = false;
}

function kick() {
  if (running) return;
  running = true;
  requestAnimationFrame(tick);
}

function nextFrame(task) { onceTasks.add(task); kick(); }

function everyFrame(task) {
  alwaysTasks.add(task);
  kick();
  return () => alwaysTasks.delete(task);
}

function onScroll(task) {
  task();
  window.addEventListener('scroll', () => nextFrame(task), { passive: true });
}

/* ==========================================================================
   Boot overlay
   ========================================================================== */

function initBootOverlay() {
  const boot = $('[data-boot]');
  if (!boot) return;

  if (reduceMotion.matches) { boot.remove(); return; }

  const dismiss = () => {
    boot.classList.add('is-done');
    window.setTimeout(() => boot.remove(), 800);
  };

  window.setTimeout(dismiss, 1150);
  ['pointerdown', 'keydown', 'wheel'].forEach((type) =>
    window.addEventListener(type, dismiss, { once: true, passive: true })
  );
}

/* ==========================================================================
   Hero terminal — type the command, then stream the output
   ========================================================================== */

function initTerminal() {
  const terminal = $('[data-terminal]');
  if (!terminal) return;

  const cmdNode = $('[data-terminal-cmd]', terminal);
  const lines = $$('[data-terminal-out]', terminal);
  if (!cmdNode) return;

  const command = cmdNode.dataset.terminalCmd || cmdNode.textContent;

  if (reduceMotion.matches) {
    cmdNode.textContent = command;
    lines.forEach((line) => line.classList.add('is-shown'));
    return;
  }

  cmdNode.textContent = '';

  const run = async () => {
    await wait(reduceMotion.matches ? 0 : 900);

    for (let i = 1; i <= command.length; i += 1) {
      cmdNode.textContent = command.slice(0, i);
      await wait(38);
    }

    await wait(240);

    for (const line of lines) {
      line.classList.add('is-shown');
      await wait(Number.parseInt(line.dataset.terminalOut, 10) || 90);
    }

    terminal.dataset.state = 'done';
  };

  run();
}

/* ==========================================================================
   Reveal on scroll
   ========================================================================== */

function initReveal() {
  const targets = $$('[data-reveal], [data-reveal-media]');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const groups = new Map();
  targets.forEach((el) => {
    const list = groups.get(el.parentElement) || [];
    list.push(el);
    groups.set(el.parentElement, list);
  });

  groups.forEach((list) => {
    if (list.length < 2) return;
    list.forEach((el, index) => {
      if (!el.style.getPropertyValue('--reveal-delay')) {
        el.style.setProperty('--reveal-delay', `${Math.min(index, 9) * 55}ms`);
      }
    });
  });

  const observer = new IntersectionObserver(
    (entries, obs) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      obs.unobserve(entry.target);
    }),
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
    nav.classList.toggle('is-stuck', y > 20);
    nav.classList.toggle('is-hidden', y > 420 && y > lastY && (!drawer || drawer.hidden));
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
    drawer.addEventListener('click', (event) => { if (event.target.closest('a')) close(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 1160) close(); });
  }

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
        if (best > 0 && link.getAttribute('href') === `#${bestId}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    },
    { rootMargin: '-48% 0px -48% 0px', threshold: [0, 0.2, 0.5, 1] }
  );

  sections.forEach((section) => spy.observe(section));
}

/* ==========================================================================
   Command palette (⌘K / Ctrl+K)
   ========================================================================== */

function initPalette() {
  const dialog = $('[data-palette]');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const input = $('[data-palette-input]', dialog);
  const list = $('[data-palette-list]', dialog);
  if (!input || !list) return;

  const iconFor = (kind) => ({ section: 'i-hash', project: 'i-box', link: 'i-external' }[kind] || 'i-hash');

  // The palette indexes what is already on the page — no separate source of
  // truth to drift out of sync.
  const items = [
    ...$$('[data-nav-link]').map((link) => ({
      kind: 'section',
      group: 'Secciones',
      label: (link.dataset.label || link.textContent).trim(),
      hint: link.getAttribute('href'),
      run: () => { document.querySelector(link.getAttribute('href'))?.scrollIntoView(); },
    })),
    ...$$('[data-dialog-open]').map((button) => ({
      kind: 'project',
      group: 'Proyectos',
      label: button.textContent.trim(),
      hint: button.closest('.project')?.dataset.kicker || '',
      run: () => document.getElementById(button.dataset.dialogOpen)?.showModal(),
    })),
    ...$$('[data-palette-link]').map((link) => ({
      kind: 'link',
      group: 'Enlaces',
      label: link.dataset.paletteLink,
      hint: link.getAttribute('href').replace(/^mailto:/, ''),
      run: () => window.open(link.href, link.target || '_self', 'noopener'),
    })),
  ];

  let matches = items;
  let active = 0;

  /** Loose subsequence match, the way editors filter command lists. */
  const score = (haystack, needle) => {
    const text = haystack.toLowerCase();
    const query = needle.toLowerCase();
    if (!query) return 0;
    if (text.includes(query)) return 100 - text.indexOf(query);

    let cursor = 0;
    for (const char of query) {
      cursor = text.indexOf(char, cursor);
      if (cursor === -1) return -1;
      cursor += 1;
    }
    return 1;
  };

  const render = () => {
    list.replaceChildren();

    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'palette__empty';
      empty.textContent = 'Sin resultados';
      list.append(empty);
      return;
    }

    let group = null;
    matches.forEach((item, index) => {
      if (item.group !== group) {
        group = item.group;
        const heading = document.createElement('p');
        heading.className = 'palette__group';
        heading.textContent = group;
        list.append(heading);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'palette__item';
      button.id = `palette-item-${index}`;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === active));
      button.innerHTML =
        `<svg aria-hidden="true" focusable="false"><use href="#${iconFor(item.kind)}"></use></svg>`
        + `<span></span><small></small>`;
      $('span', button).textContent = item.label;
      $('small', button).textContent = item.hint || '';
      button.addEventListener('click', () => choose(index));
      list.append(button);
    });

    const selected = $(`#palette-item-${active}`, list);
    input.setAttribute('aria-activedescendant', selected ? selected.id : '');
    selected?.scrollIntoView({ block: 'nearest' });
  };

  const filter = (query) => {
    matches = query
      ? items
        .map((item) => ({ item, s: score(`${item.label} ${item.hint}`, query) }))
        .filter((entry) => entry.s >= 0)
        .sort((a, b) => b.s - a.s)
        .map((entry) => entry.item)
      : items;
    active = 0;
    render();
  };

  const choose = (index) => {
    const item = matches[index];
    if (!item) return;
    dialog.close();
    // Let the dialog finish closing so focus and scrolling land cleanly.
    window.setTimeout(() => item.run(), 60);
  };

  const open = () => {
    if (dialog.open) return;
    input.value = '';
    filter('');
    dialog.showModal();
    document.body.classList.add('is-locked');
    input.focus();
  };

  input.addEventListener('input', () => filter(input.value.trim()));

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      event.preventDefault();
      active = (active + 1) % Math.max(matches.length, 1);
      render();
    } else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      event.preventDefault();
      active = (active - 1 + matches.length) % Math.max(matches.length, 1);
      render();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active);
    }
  });

  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => document.body.classList.remove('is-locked'));

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      dialog.open ? dialog.close() : open();
    }
  });

  $$('[data-palette-open]').forEach((button) => button.addEventListener('click', open));
}

/* ==========================================================================
   Editor tabs
   ========================================================================== */

function initTabs() {
  $$('[data-tabs]').forEach((group) => {
    const tabs = $$('[role="tab"]', group);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls'))).filter(Boolean);
    if (tabs.length !== panels.length) return;

    const select = (index, focus = true) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index, false));
      tab.addEventListener('keydown', (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        select((index + step + tabs.length) % tabs.length);
      });
    });

    select(Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true')), false);
  });
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
   Parallax
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
  let stop = () => {};
  let easing = false;

  const paint = () => {
    x = lerp(x, targetX, 0.07);
    y = lerp(y, targetY, 0.07);

    layers.forEach(({ el, speed, drift }) => {
      el.style.transform =
        `translate3d(${(x * drift).toFixed(2)}px, ${(scrollY * speed + y * drift * 0.6).toFixed(2)}px, 0)`;
    });

    if (easing && Math.abs(targetX - x) < 0.05 && Math.abs(targetY - y) < 0.05) {
      stop();
      easing = false;
    }
  };

  window.addEventListener('scroll', () => { scrollY = window.scrollY; nextFrame(paint); }, { passive: true });

  if (finePointer.matches) {
    window.addEventListener('pointermove', (event) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
      if (!easing) { easing = true; stop = everyFrame(paint); }
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
    x = lerp(x, targetX, 0.2);
    y = lerp(y, targetY, 0.2);
    cursor.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    if (Math.abs(targetX - x) < 0.1 && Math.abs(targetY - y) < 0.1) { stop(); looping = false; }
  };

  const HOVER = 'a, button, [role="button"], input, textarea, .project, .card';

  window.addEventListener('pointermove', (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    cursor.classList.add('is-active');
    cursor.classList.toggle('is-hovering', Boolean(event.target.closest(HOVER)));
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
    const strength = Number.parseFloat(el.dataset.magnetic) || 0.25;
    const reset = () => { el.style.transform = ''; };

    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate3d(${(dx * strength).toFixed(2)}px, ${(dy * strength).toFixed(2)}px, 0)`;
    });

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

  track.append(...Array.from(track.children).map((node) => {
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
    velocity = clamp((window.scrollY - lastY) * 0.32, -26, 26);
    lastY = window.scrollY;
  }, { passive: true });

  const paint = () => {
    velocity *= 0.92;
    offset -= 0.4 + velocity;

    const width = half();
    if (width > 0) {
      if (offset <= -width) offset += width;
      if (offset > 0) offset -= width;
    }

    track.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`;
  };

  // An always-on rAF loop costs battery for something nobody can see.
  let stop = null;
  let onScreen = true;

  const sync = () => {
    const shouldRun = onScreen && !document.hidden;
    if (shouldRun && !stop) stop = everyFrame(paint);
    else if (!shouldRun && stop) { stop(); stop = null; }
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); })
      .observe(track.parentElement || track);
  }

  document.addEventListener('visibilitychange', sync);
  sync();
}

/* ==========================================================================
   Role typewriter
   ========================================================================== */

function initTypewriter() {
  const host = $('[data-typewriter]');
  if (!host) return;

  let roles = [];
  try { roles = JSON.parse(host.dataset.typewriter); } catch { roles = []; }
  if (!Array.isArray(roles) || !roles.length) return;

  if (reduceMotion.matches) { host.textContent = roles[0]; return; }

  const TYPE = 50;
  const ERASE = 25;
  const HOLD = 2100;

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
      delay = 280;
    }

    timer = window.setTimeout(tick, delay);
  };

  window.setTimeout(tick, 2600);

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

    const duration = 1400;
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
   Pointer spotlight
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

      if (show) card.hidden = false;
      else timers.set(card, window.setTimeout(() => { card.hidden = true; }, reduceMotion.matches ? 0 : 240));
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

    if (event.target.closest('[data-dialog-close]')) event.target.closest('dialog')?.close();
  });

  dialogs.forEach((dialog) => {
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
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
   Status bar
   ========================================================================== */

function initStatusBar() {
  const clock = $('[data-clock]');
  if (!clock) return;

  const format = new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City',
  });

  const update = () => { clock.textContent = `${format.format(new Date())} CST`; };
  update();
  window.setInterval(update, 30_000);
}

/* ==========================================================================
   Contact form
   --------------------------------------------------------------------------
   Static hosting: no endpoint to POST to. Validate here, then hand a fully
   composed message to the visitor's mail client.
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

    window.location.href = `mailto:${recipient}`
      + `?subject=${encodeURIComponent(`Nuevo contacto desde el portafolio — ${read('name')}`)}`
      + `&body=${encodeURIComponent(lines.join('\n'))}`;

    if (status) status.textContent = '→ Abriendo tu cliente de correo con el mensaje listo para enviar…';
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
        label.textContent = '✓ copiado';
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
    initBootOverlay,
    initTerminal,
    initReveal,
    initNavigation,
    initPalette,
    initTabs,
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
    initStatusBar,
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
