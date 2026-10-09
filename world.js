(() => {
  'use strict';

  // Destinations, palette and pacing remain data, not six separate scroll handlers.
  // Each world lives at the focal point of its predecessor, in world coordinates.
  const definitions = [
    { id: 'exterior', label: 'Bienvenido a Ratito', palette: 0, duration: 1.15, focal: [.23, .12] },
    { id: 'sesiones', label: 'Sesiones de 30 segundos', palette: 1, duration: 1.15, focal: [.23, .10] },
    { id: 'modos', label: 'Elegí tu modo', palette: 2, duration: 1.3, focal: [.23, .12] },
    { id: 'pregunta', label: 'Una pregunta, cuatro opciones', palette: 3, duration: 1.45, focal: [.27, .08] },
    { id: 'aprendes', label: 'Si errás, aprendés', palette: 0, duration: 1.45, focal: [.22, .10] },
    { id: 'final', label: 'Empezar un ratito', palette: 0, duration: .65, focal: [0, 0] }
  ];
  const $ = selector => document.querySelector(selector);
  const journey = $('.journey');
  const stage = $('.stage');
  const nav = $('.scene-nav');
  const footer = $('.journey-footer');
  const bar = $('.progress-fill');
  const chapterLabel = $('.chapter-label');
  const chapterCount = $('.chapter-count');
  const countdown = $('#countdown');
  const hand = $('.timer-hand');
  const atmosphere = [...document.querySelectorAll('.aura')];
  const stars = [...document.querySelectorAll('.stars')];
  const trails = $('.flight-trails');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const shortViewport = matchMedia('(max-height: 620px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const total = definitions.reduce((sum, scene) => sum + scene.duration, 0);
  let elapsed = 0;
  const scenes = definitions.map((definition, index) => {
    const element = document.getElementById(definition.id);
    const scene = { ...definition, index, element, start: elapsed / total,
      span: definition.duration / total, copy: element.querySelector('.scene-copy'),
      art: element.querySelector('.art'), x: 0, y: 0, size: 1, entered: 0, sequence: 0 };
    elapsed += definition.duration;
    const link = document.createElement('a');
    link.href = `#${scene.id}`;
    link.setAttribute('aria-label', `${index + 1}. ${scene.label}`);
    link.title = scene.label;
    nav.append(link);
    scene.link = link;
    return scene;
  });

  // Mask each word without replacing semantic headings or their emphasis.
  document.querySelectorAll('h1, h2').forEach(heading => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let order = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word => {
        if (!word.trim()) { fragment.append(document.createTextNode(word)); return; }
        const mask = document.createElement('span');
        const inner = document.createElement('span');
        mask.className = 'word-mask'; inner.className = 'word-inner';
        inner.style.setProperty('--word', order++); inner.textContent = word;
        mask.append(inner); fragment.append(mask);
      });
      node.replaceWith(fragment);
    });
  });

  // Stable glyph layout: typewriting changes only opacity, never layout or width.
  const writers = [...document.querySelectorAll('[data-typewriter]')].map(element => {
    const text = element.textContent;
    const accessible = document.createElement('span');
    accessible.className = 'sr-only'; accessible.textContent = text;
    const visual = document.createElement('span'); visual.setAttribute('aria-hidden', 'true');
    const letters = [...text].map(letter => {
      const span = document.createElement('span'); span.textContent = letter;
      visual.append(span); return span;
    });
    element.replaceChildren(accessible, visual);
    return { element, letters, count: -1 };
  });
  function write(writer, amount) {
    const count = Math.ceil(clamp(amount) * writer.letters.length);
    if (count === writer.count) return;
    writer.letters.forEach((letter, index) => { letter.style.opacity = index < count ? '1' : '0'; });
    writer.count = count;
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  // Intro assembly wraps idle elements, so the two transforms never compete.
  [...$('.diorama').children].forEach((child, index) => {
    const wrapper = document.createElementNS(svgNS, 'g');
    wrapper.classList.add('intro-piece');
    wrapper.style.setProperty('--intro-delay', `${Math.min(index * 16, 240)}ms`);
    child.replaceWith(wrapper); wrapper.append(child);
  });

  const ring = Array.from({ length: 60 }, (_, index) => {
    const tick = document.createElement('i'); tick.style.setProperty('--angle', `${index * 6}deg`);
    const colors = ['', 'ring-amber', 'ring-red'].map(name => {
      const stroke = document.createElement('b'); stroke.className = name; tick.append(stroke); return stroke;
    });
    $('.timer-ring').append(tick); return { tick, colors };
  });
  for (let index = 0; index < 18; index++) {
    const drop = document.createElementNS(svgNS, 'line');
    const x = 114 + (index * 41) % 265;
    const y = 92 + (index * 23) % 125;
    drop.setAttribute('x1', x); drop.setAttribute('x2', x - 4);
    drop.setAttribute('y1', y); drop.setAttribute('y2', y + 14);
    drop.setAttribute('stroke', '#b3d7ea'); drop.setAttribute('stroke-width', '1.5');
    drop.style.setProperty('--delay', `${-index * .17}s`);
    $('.rain').append(drop);
  }
  document.querySelectorAll('.confetti').forEach(container => {
    for (let index = 0; index < 24; index++) {
      const piece = document.createElement('i');
      const angle = (index / 24) * Math.PI * 2;
      piece.style.setProperty('--dx', `${Math.cos(angle) * (80 + index * 5)}px`);
      piece.style.setProperty('--dy', `${-70 - (index * 31) % 125}px`);
      piece.style.setProperty('--delay', `${container.classList.contains('gentle') ? -index * .27 : index % 5 * .035}s`);
      container.append(piece);
    }
  });
  const vocabulary = ['guest', 'roof', 'booking', 'door', 'water', 'miner', 'server', 'porter'];
  const flybys = vocabulary.map((word, index) => {
    const element = document.createElement('span'); element.textContent = word;
    trails.append(element);
    return { element, depth: 1 + index % 3 * .55, side: index % 2 ? 1 : -1, offset: index / vocabulary.length };
  });
  const streaks = Array.from({ length: 12 }, (_, index) => {
    const element = document.createElement('i'); trails.append(element);
    return { element, side: index % 2 ? 1 : -1, offset: index / 12 };
  });
  const answers = [...document.querySelectorAll('.answers li')];
  const cursor = $('.demo-cursor');
  const lesson = $('.lesson-reveal');
  const levelTrack = $('.level-track i');
  const badge = $('.level-badge');

  let enabled = false, width = 0, height = 0, journeyTop = 0, scrollRange = 1;
  let target = 0, progress = 0, frame = 0, lastTime = 0, activeIndex = -1;
  let lastTimerStep = -1, timerElapsed = 0, timerStamp = 0;
  let pointerX = 0, pointerY = 0;

  function measure() {
    width = stage.clientWidth; height = stage.clientHeight;
    journeyTop = journey.getBoundingClientRect().top + window.scrollY;
    scrollRange = Math.max(1, journey.offsetHeight - height);
    scenes.forEach((scene, index) => {
      if (!index) return;
      const previous = scenes[index - 1];
      // Measure the actual hotel door, including the mobile composition.
      // Offset dimensions ignore camera transforms, unlike bounding client rects.
      const art = previous.art;
      const focalX = previous.id === 'modos' ? .50 : .5;
      const focalY = previous.id === 'modos' ? .70 : .55;
      const focal = width > 900 ? previous.focal : [0, .20];
      const destinationX = previous.id === 'modos'
        ? art.offsetLeft + art.offsetWidth * focalX - width / 2 : focal[0] * width;
      const destinationY = previous.id === 'modos'
        ? art.offsetTop + art.offsetHeight * focalY - height / 2 : focal[1] * height;
      scene.x = previous.x + destinationX * previous.size;
      scene.y = previous.y + destinationY * previous.size;
      scene.size = previous.size * .20;
    });
    readScroll();
  }
  function readScroll() {
    if (!enabled) return;
    target = clamp((window.scrollY - journeyTop) / scrollRange);
    requestFrame();
  }
  function requestFrame() {
    if (enabled && !document.hidden && !frame) frame = requestAnimationFrame(render);
  }
  function setActive(index, time) {
    if (activeIndex === index) return;
    activeIndex = index;
    scenes.forEach((scene, i) => {
      const active = i === index;
      scene.element.classList.toggle('is-active', active);
      scene.element.inert = !active;
      scene.element.setAttribute('aria-hidden', String(!active));
      if (active) scene.link.setAttribute('aria-current', 'step');
      else scene.link.removeAttribute('aria-current');
    });
    const scene = scenes[index]; scene.entered = time; scene.sequence = 0;
    scene.element.classList.remove('answered', 'celebrate', 'mistake', 'learned', 'leveled');
    timerStamp = time;
    const number = String(index + 1).padStart(2, '0');
    chapterLabel.textContent = `${number} — ${scene.label.toLocaleUpperCase('es-AR')}`;
    chapterCount.textContent = `${number} / 06`;
    chapterLabel.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)' });
  }

  function tickTimer(time) {
    timerElapsed += Math.max(0, time - timerStamp); timerStamp = time;
    const seconds = (timerElapsed / 1000) % 31;
    const remaining = Math.max(0, 30 - Math.floor(seconds));
    const step = Math.min(60, Math.floor(seconds * 2));
    if (step !== lastTimerStep) {
      countdown.textContent = `00:${String(remaining).padStart(2, '0')}`;
      const amber = smooth(clamp((seconds - 12) / 5));
      const red = smooth(clamp((seconds - 23) / 3));
      ring.forEach(({ tick, colors }, index) => {
        tick.style.opacity = index < step ? '.08' : '1';
        colors[1].style.opacity = amber; colors[2].style.opacity = red;
      });
      lastTimerStep = step;
    }
    hand.style.transform = `rotate(${Math.min(seconds / 30, 1) * 360}deg)`;
  }
  function sequence(scene, local, time) {
    // Autoplay and scroll share one timeline; fast scrolling can advance it.
    const auto = (time - scene.entered) / 1000;
    const scroll = clamp(local / .55) * (scene.index === 3 ? 6.5 : 8);
    const t = Math.max(auto, scroll, scene.sequence);
    scene.sequence = t;
    if (scene.index === 3) {
      write(writers[0], t / 1.7);
      answers.forEach((answer, i) => {
        const amount = clamp((t - 1.4 - i * .16) / .55);
        // Small overshoot gives each answer a physical landing, transform only.
        const bounce = 1 - Math.pow(1 - amount, 3) + Math.sin(amount * Math.PI) * .15;
        answer.style.opacity = amount;
        answer.style.transform = `translateY(${(1 - bounce) * 22}px) scale(${.94 + .06 * bounce})`;
      });
      const click = smooth(clamp((t - 2.7) / .9));
      cursor.style.opacity = t > 2.6 && t < 4.3 ? '1' : '0';
      cursor.style.transform = `translate(${(1 - click) * 90}px, ${(1 - click) * 70}px) scale(${t > 3.55 && t < 3.85 ? .82 : 1})`;
      scene.element.classList.toggle('answered', t > 3.75);
      scene.element.classList.toggle('celebrate', t > 3.75);
      return t < 6;
    }
    scene.element.classList.toggle('mistake', t > .75);
    scene.element.classList.toggle('learned', t > 1.7);
    const reveal = smooth(clamp((t - 1.7) / .7));
    lesson.style.opacity = reveal; lesson.style.transform = `translateY(${(1 - reveal) * 16}px)`;
    write(writers[1], (t - 2.4) / 2);
    const fill = smooth(clamp((t - 4.7) / 1.4));
    levelTrack.style.transform = `scaleX(${.16 + .84 * fill})`;
    badge.style.opacity = fill;
    scene.element.classList.toggle('leveled', fill === 1);
    return t < 7;
  }

  function render(time) {
    frame = 0;
    const delta = lastTime ? Math.min(time - lastTime, 64) : 16.67;
    lastTime = time;
    progress = mix(progress, target, 1 - Math.exp(-delta / 85));
    if (Math.abs(progress - target) < .000015) progress = target;
    let index = 0;
    scenes.forEach((scene, i) => { if (progress >= scene.start) index = i; });
    const current = scenes[index], next = scenes[index + 1];
    const local = clamp((progress - current.start) / current.span);
    const travel = next ? smooth(clamp((local - .55) / .45)) : 0;
    const connector = Math.sin(travel * Math.PI);
    const path = smooth(travel);
    const cameraX = next ? mix(current.x, next.x, path) : current.x;
    const cameraY = next ? mix(current.y, next.y, path) : current.y;
    const zoom = (1 + connector * .13) * (next ? Math.exp(mix(Math.log(1 / current.size), Math.log(1 / next.size), travel)) : 1 / current.size);
    const roll = connector * (index % 2 ? -4 : 4);
    const radians = roll * Math.PI / 180;
    const cosine = Math.cos(radians), sine = Math.sin(radians);

    scenes.forEach((scene, i) => {
      const visible = i === index || (i === index + 1 && travel > .15);
      scene.element.style.visibility = visible ? 'visible' : 'hidden';
      scene.element.style.willChange = visible ? 'transform, opacity' : 'auto';
      if (!visible) return;
      const x = (scene.x - cameraX) * zoom, y = (scene.y - cameraY) * zoom;
      const scale = scene.size * zoom;
      scene.element.style.transform = `translate3d(${x * cosine - y * sine}px,${x * sine + y * cosine}px,0) rotate(${roll}deg) scale(${scale})`;
      const incoming = i === index + 1;
      scene.element.style.opacity = incoming ? smooth(clamp((travel - .18) / .5)) : 1 - smooth(clamp((travel - .15) / .55));
      const copyOpacity = incoming ? smooth(clamp((travel - .50) / .4)) : 1 - smooth(clamp(travel / .40));
      scene.copy.style.opacity = copyOpacity;
      scene.copy.style.transform = `translate3d(0,${incoming ? (1 - copyOpacity) * 24 : -(1 - copyOpacity) * 24}px,0)`;
    });
    const active = travel > .58 && next ? index + 1 : index;
    setActive(active, time);
    bar.style.transform = `scaleX(${progress})`;
    atmosphere.forEach((layer, i) => {
      layer.style.opacity = (current.palette === i ? 1 - travel : 0) + ((next || current).palette === i ? travel : 0);
    });
    stars.forEach((layer, i) => {
      layer.style.transform = `translate3d(${Math.sin(progress * Math.PI * 5) * (i + 1) * 14}px,${-progress * (i + 1) * 45}px,0) scale(${1 + connector * .1 * (i + 1)})`;
    });
    trails.style.opacity = connector * .65;
    if (connector > .01) {
      flybys.forEach(({ element, side, offset, depth }) => {
        const phase = (travel * depth + offset) % 1;
        element.style.left = `${50 + side * (18 + phase * 48)}%`;
        element.style.top = `${18 + offset * 66}%`;
        element.style.transform = `translate3d(${side * phase * 100}px,${(offset - .5) * phase * 130}px,0) rotate(${side * -8}deg) scale(${.6 + phase * depth})`;
        element.style.opacity = Math.sin(phase * Math.PI) * .7;
      });
      streaks.forEach(({ element, side, offset }) => {
        element.style.left = `${50 + side * (20 + offset * 30)}%`;
        element.style.top = `${10 + offset * 80}%`;
        element.style.transform = `translateX(${side * travel * 140}px) rotate(${side * (offset - .5) * 40}deg) scaleX(${connector * (1 + offset)})`;
      });
    }
    scenes[0].art.style.setProperty('--lean', `${finePointer.matches ? 0 : Math.sin(local * Math.PI) * 2}deg`);
    let running = false;
    if (active === 1) { tickTimer(time); running = true; }
    if (active === 3 || active === 4) running = sequence(scenes[active], active === index ? local : 0, time);
    if (progress !== target || running) requestFrame();
    else lastTime = 0;
  }

  function goToScene(id, behavior = 'smooth') {
    const scene = scenes.find(item => item.id === id);
    if (!scene) return;
    if (enabled) window.scrollTo({ top: journeyTop + scene.start * scrollRange, behavior });
    else scene.element.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : behavior });
  }
  function staticPresentation() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    scenes.forEach(scene => {
      scene.element.removeAttribute('style'); scene.copy.removeAttribute('style');
      scene.art.removeAttribute('style'); scene.element.removeAttribute('aria-hidden');
      scene.element.inert = false;
      scene.element.classList.remove('is-active', 'celebrate', 'answered', 'mistake', 'learned', 'leveled');
    });
    writers.forEach(writer => write(writer, 1));
    answers.forEach(answer => answer.removeAttribute('style'));
    lesson.removeAttribute('style'); levelTrack.removeAttribute('style'); badge.removeAttribute('style');
    countdown.textContent = '00:30'; hand.removeAttribute('style');
    ring.forEach(({ tick, colors }) => { tick.style.opacity = 1; colors[1].style.opacity = 0; colors[2].style.opacity = 0; });
    atmosphere.forEach((layer, i) => { layer.style.opacity = i === 0 ? 1 : 0; });
    $('.primary-cta').style.transform = '';
  }
  function configure() {
    const shouldEnable = !reducedMotion.matches && !shortViewport.matches;
    if (shouldEnable === enabled) { if (enabled) measure(); else staticPresentation(); return; }
    const previousScene = Math.max(0, activeIndex);
    enabled = shouldEnable;
    document.documentElement.classList.toggle('flight', enabled);
    nav.hidden = !enabled; footer.hidden = !enabled;
    if (enabled) {
      measure(); progress = target; activeIndex = -1; lastTimerStep = -1;
      requestFrame();
    } else {
      staticPresentation();
      if (previousScene) scenes[previousScene].element.scrollIntoView({ behavior: 'instant' });
    }
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = anchor.hash.slice(1);
    if (!scenes.some(scene => scene.id === id)) return;
    event.preventDefault(); goToScene(id);
    try { history.replaceState(null, '', `#${id}`); } catch { /* file:// can restrict history. */ }
    if (anchor.classList.contains('skip-link')) {
      const cta = $('.primary-cta'); goToScene(id, 'instant');
      if (enabled) { progress = target = scenes[5].start; render(performance.now()); }
      cta.focus({ preventScroll: true });
    }
  });
  stage.addEventListener('pointermove', event => {
    if (!enabled || !finePointer.matches || activeIndex !== 0) return;
    pointerX = (event.clientX / width - .5) * 2;
    pointerY = (event.clientY / height - .5) * 2;
    const art = scenes[0].art;
    art.style.setProperty('--look-x', `${pointerX * 6}px`);
    art.style.setProperty('--look-y', `${pointerY * 4}px`);
    art.style.setProperty('--mouse-x', `${pointerX * 3}px`);
    art.style.setProperty('--mouse-y', `${pointerY * 2}px`);
    art.style.setProperty('--mouse-angle', `${pointerX * 5}deg`);
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { scenes[0].art.removeAttribute('style'); });
  const cta = $('.primary-cta');
  cta.addEventListener('pointermove', event => {
    if (!enabled || !finePointer.matches) return;
    const box = cta.getBoundingClientRect();
    cta.style.transform = `translate(${(event.clientX - box.left - box.width / 2) * .09}px,${(event.clientY - box.top - box.height / 2) * .12}px)`;
  });
  cta.addEventListener('pointerleave', () => { cta.style.transform = ''; });
  cta.addEventListener('pointerdown', event => {
    if (reducedMotion.matches) return;
    const box = cta.getBoundingClientRect();
    const ripple = document.createElement('i'); ripple.className = 'ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${event.clientX - box.left}px`; ripple.style.top = `${event.clientY - box.top}px`;
    cta.append(ripple); ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', configure, { passive: true });
  window.addEventListener('hashchange', () => goToScene(location.hash.slice(1)));
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('tab-hidden', document.hidden);
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else { timerStamp = performance.now(); lastTime = 0; requestFrame(); }
  });
  reducedMotion.addEventListener('change', configure);
  shortViewport.addEventListener('change', configure);
  configure();
  if (location.hash) requestAnimationFrame(() => goToScene(location.hash.slice(1), 'instant'));
})();
