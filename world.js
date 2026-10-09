(() => {
  'use strict';

  // Each destination lives inside the focal point of the preceding diorama.
  // Coordinates are viewport fractions, relative to its center.
  const definitions = [
    { id: 'exterior', label: 'Bienvenido a Ratito', accent: '#22d3ee', duration: 1.15, focal: [-0.04, 0.18] },
    { id: 'sesiones', label: 'Sesiones de 30 segundos', accent: '#22d3ee', duration: 1.1, focal: [0, 0.13] },
    { id: 'modos', label: 'Elegí tu modo', accent: '#c084fc', duration: 1.25, focal: [0.19, 0.06] },
    { id: 'pregunta', label: 'Una pregunta, cuatro opciones', accent: '#fbbf24', duration: 1.3, focal: [0, 0.18] },
    { id: 'aprendes', label: 'Si errás, aprendés', accent: '#c084fc', duration: 1.25, focal: [0, 0.16] },
    { id: 'final', label: 'Empezar un ratito', accent: '#22d3ee', duration: 0.55, focal: [0, 0] }
  ];
  const journey = document.querySelector('.journey');
  const stage = document.querySelector('.stage');
  const nav = document.querySelector('.scene-nav');
  const footer = document.querySelector('.journey-footer');
  const bar = document.querySelector('.progress-fill');
  const chapterLabel = document.querySelector('.chapter-label');
  const chapterCount = document.querySelector('.chapter-count');
  const countdown = document.querySelector('#countdown');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const shortViewport = matchMedia('(max-height: 620px)');
  const total = definitions.reduce((sum, scene) => sum + scene.duration, 0);
  let elapsed = 0;
  const scenes = definitions.map((definition, index) => {
    const element = document.getElementById(definition.id);
    const scene = {
      ...definition, element, index, start: elapsed / total,
      span: definition.duration / total,
      text: element.querySelector('.description').textContent,
      x: 0, y: 0, size: 1
    };
    elapsed += definition.duration;
    const link = document.createElement('a');
    link.href = `#${scene.id}`;
    link.setAttribute('aria-label', `${index + 1}. ${scene.label}`);
    link.title = `${scene.label}: ${scene.text}`;
    nav.append(link);
    scene.link = link;
    return scene;
  });

  let enabled = false;
  let width = 0;
  let height = 0;
  let scrollRange = 1;
  let journeyTop = 0;
  let target = 0;
  let progress = 0;
  let frame = 0;
  let lastTime = 0;
  let activeIndex = -1;
  let quizAnswered = false;
  const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  function measure() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    journeyTop = journey.getBoundingClientRect().top + window.scrollY;
    scrollRange = Math.max(1, journey.offsetHeight - height);
    scenes.forEach((scene, index) => {
      if (!index) return;
      const previous = scenes[index - 1];
      // Rooms shrink into one another; the camera never jumps between worlds.
      const focal = previous.id === 'modos' && width >= 600 ? [0, 0.09] : previous.focal;
      scene.x = previous.x + focal[0] * width * previous.size;
      scene.y = previous.y + focal[1] * height * previous.size;
      scene.size = previous.size * 0.115;
    });
    readScroll();
  }

  function readScroll() {
    if (!enabled) return;
    target = clamp((window.scrollY - journeyTop) / scrollRange);
    requestFrame();
  }

  function requestFrame() {
    if (enabled && !frame) frame = requestAnimationFrame(render);
  }

  function setActive(index) {
    if (activeIndex === index) return;
    activeIndex = index;
    scenes.forEach((scene, i) => {
      const active = i === index;
      if (active) scene.link.setAttribute('aria-current', 'step');
      else scene.link.removeAttribute('aria-current');
      scene.element.inert = !active;
      scene.element.setAttribute('aria-hidden', String(!active));
    });
    const scene = scenes[index];
    const number = String(index + 1).padStart(2, '0');
    chapterLabel.textContent = `${number} — ${scene.label.toLocaleUpperCase('es-AR')}`;
    chapterCount.textContent = `${number} / 06`;
    bar.style.backgroundColor = scene.accent;
  }

  function render(time) {
    frame = 0;
    // Time-corrected lerp gives the same damping on 60 Hz and 120 Hz screens.
    const delta = lastTime ? Math.min(time - lastTime, 64) : 16.67;
    lastTime = time;
    progress = mix(progress, target, 1 - Math.exp(-delta / 85));
    if (Math.abs(progress - target) < 0.000015) progress = target;

    let index = scenes.findLastIndex(scene => progress >= scene.start);
    index = Math.max(0, index);
    const current = scenes[index];
    const next = scenes[index + 1];
    const local = clamp((progress - current.start) / current.span);
    // A reading plateau, then a dive, then the connector into the next room.
    const travel = next ? smooth(clamp((local - 0.43) / 0.57)) : 0;
    const dive = smooth(clamp(travel / 0.38));
    const connector = smooth(clamp((travel - 0.22) / 0.78));
    const cameraX = next ? mix(current.x, next.x, mix(dive * 0.32, 1, connector)) : current.x;
    const cameraY = next ? mix(current.y, next.y, mix(dive * 0.32, 1, connector)) : current.y;
    const zoom = 1.015 * (next ? Math.exp(mix(Math.log(1 / current.size), Math.log(1 / next.size), travel)) : 1 / current.size);
    const roll = Math.sin(travel * Math.PI) * (index % 2 ? -2.2 : 2.2);
    const radians = roll * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);

    scenes.forEach((scene, i) => {
      // Keep only the current room and its destination on the compositor.
      const visible = i === index || (i === index + 1 && travel > 0);
      scene.element.style.visibility = visible ? 'visible' : 'hidden';
      scene.element.style.willChange = visible ? 'transform' : 'auto';
      if (!visible) return;
      const x = (scene.x - cameraX) * zoom;
      const y = (scene.y - cameraY) * zoom;
      const scale = scene.size * zoom;
      scene.element.style.transform = `translate3d(${x * cosine - y * sine}px,${x * sine + y * cosine}px,0) rotate(${roll}deg) scale(${scale})`;
      // Open the portal geometrically, without fading in a distant slide.
      // The outgoing layer fades only after the destination fills the screen.
      const incoming = i === index + 1;
      scene.element.style.clipPath = incoming && travel < 0.2
        ? `circle(${smooth(travel / 0.2) * 72}% at 50% 50%)` : 'none';
      scene.element.style.opacity = !incoming && next
        ? 1 - clamp((next.size * zoom - 1) / 0.015) : 1;
      scene.element.style.borderRadius = `${16 * clamp(1 - scale)}px`;
    });

    setActive(travel > 0.995 && next ? index + 1 : index);
    bar.style.transform = `scaleX(${progress})`;
    if (index === 1) countdown.textContent = `00:${String(30 - Math.floor(clamp(local / 0.43) * 5)).padStart(2, '0')}`;
    const answer = index > 3 || (index === 3 && local > 0.12);
    if (answer !== quizAnswered) {
      quizAnswered = answer;
      scenes[3].element.classList.toggle('answered', answer);
      scenes[3].element.classList.toggle('celebrate', answer && index === 3);
    }
    if (progress !== target) requestFrame();
    else lastTime = 0;
  }

  function goToScene(id, behavior = 'smooth') {
    const scene = scenes.find(item => item.id === id);
    if (!scene) return;
    if (enabled) {
      window.scrollTo({ top: journeyTop + scene.start * scrollRange, behavior });
    } else {
      scene.element.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : behavior });
    }
  }

  function configure() {
    const shouldEnable = !reducedMotion.matches && !shortViewport.matches;
    if (shouldEnable === enabled) {
      if (enabled) measure();
      return;
    }
    const previousScene = activeIndex < 0 ? 0 : activeIndex;
    enabled = shouldEnable;
    document.documentElement.classList.toggle('flight', enabled);
    nav.hidden = !enabled;
    footer.hidden = !enabled;
    if (enabled) {
      measure();
      progress = target;
      activeIndex = -1;
      requestFrame();
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      scenes.forEach(scene => {
        scene.element.removeAttribute('style');
        scene.element.removeAttribute('aria-hidden');
        scene.element.inert = false;
        scene.element.classList.remove('celebrate');
      });
      countdown.textContent = '00:30';
      if (previousScene) scenes[previousScene].element.scrollIntoView({ behavior: 'instant' });
    }
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = anchor.hash.slice(1);
    if (!scenes.some(scene => scene.id === id)) return;
    event.preventDefault();
    goToScene(id);
    // replaceState may be restricted by some browsers on file:// URLs.
    try { history.replaceState(null, '', `#${id}`); } catch { /* Scrolling still works. */ }
    if (anchor.classList.contains('skip-link')) {
      const cta = scenes.at(-1).element.querySelector('.primary-cta');
      goToScene(id, 'instant');
      if (enabled) { progress = target = scenes.at(-1).start; render(performance.now()); }
      cta.focus({ preventScroll: true });
    }
  });
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', configure, { passive: true });
  reducedMotion.addEventListener('change', configure);
  shortViewport.addEventListener('change', configure);
  configure();
  if (location.hash) requestAnimationFrame(() => goToScene(location.hash.slice(1), 'instant'));
})();
