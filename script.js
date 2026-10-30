const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.main-nav a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open'); toggle?.setAttribute('aria-expanded', 'false');
}));

// Pestañas de impacto (clic y flechas del teclado)
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, focus = false) {
  tabs.forEach(t => {
    const active = t === tab;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('.tab-content').forEach(c => { c.hidden = c.id !== tab.dataset.tab; });
  if (focus) tab.focus();
  spinGraduates();
}

// Las tarjetas de becarios entran girando cada vez que se abre su pestaña
function spinGraduates() {
  const grid = document.querySelector('.grad-grid');
  if (!grid || grid.closest('[hidden]')) return;
  grid.classList.remove('spin');
  void grid.offsetWidth; // reinicia la animación
  grid.classList.add('spin');
}
tabs.forEach((tab, i) => {
  tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', e => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    selectTab(tabs[(next + tabs.length) % tabs.length], true);
  });
});
// Enlaces que abren una pestaña concreta (p. ej. "Conoce a nuestros becarios graduados")
document.querySelectorAll('[data-open-tab]').forEach(link => link.addEventListener('click', () => {
  const tab = tabs.find(t => t.dataset.tab === link.dataset.openTab);
  if (tab) selectTab(tab);
}));

// Filtros de galería
const galleryItems = document.querySelectorAll('.gallery-grid figure');
document.querySelectorAll('.filters button').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.filters button').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
  btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
  const filter = btn.dataset.filter;
  galleryItems.forEach(item => { item.hidden = filter !== 'todo' && item.dataset.cat !== filter; });
}));

// Vista ampliada de imágenes
const lightbox = document.querySelector('.lightbox');
const lightboxImg = lightbox?.querySelector('img');
const lightboxCaption = lightbox?.querySelector('.lightbox-caption');
function openLightbox(item) {
  const img = item.querySelector('img');
  // La galería muestra miniaturas; data-full apunta a la foto completa
  lightboxImg.src = item.dataset.full || img.src;
  lightboxImg.alt = img.alt;
  // Las fotos pequeñas (206 px) sin versión completa se muestran al doble para que se aprecien
  lightboxImg.style.width = !item.dataset.full && img.naturalWidth && img.naturalWidth < 400 ? `${img.naturalWidth * 2}px` : '';
  lightboxCaption.textContent = item.querySelector('figcaption')?.textContent ?? '';
  lightbox.showModal();
}
galleryItems.forEach(item => {
  item.tabIndex = 0;
  item.setAttribute('role', 'button');
  item.setAttribute('aria-label', `Ampliar foto: ${item.querySelector('figcaption')?.textContent ?? ''}`);
  item.addEventListener('click', () => openLightbox(item));
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(item); }
  });
});
lightbox?.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox?.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });

// Ficha de detalle de cada becario graduado
const gradDialog = document.querySelector('.grad-dialog');
const canHover = window.matchMedia('(hover: hover)').matches;
document.querySelectorAll('.grad-card').forEach((card, i) => {
  card.style.setProperty('--i', i); // retraso escalonado del giro de entrada
  const open = () => {
    const img = card.querySelector('img');
    const dialogImg = gradDialog.querySelector('img');
    dialogImg.src = img.src;
    dialogImg.alt = img.alt;
    const ribbon = card.querySelector('.ribbon')?.textContent;
    gradDialog.querySelector('h3').textContent = card.querySelector('h4').textContent;
    gradDialog.querySelector('.degree').textContent = card.querySelector('.grad-summary p').textContent + (ribbon ? ` · ${ribbon}` : '');
    gradDialog.querySelector('.badge').textContent = /^Licda\./.test(card.querySelector('h4').textContent) ? 'Becaria universitaria' : 'Becario universitario';
    gradDialog.querySelector('.grad-dialog-details').replaceChildren(...card.querySelector('.grad-details').cloneNode(true).childNodes);
    gradDialog.showModal();
  };
  card.querySelector('.grad-more')?.addEventListener('click', e => { e.stopPropagation(); open(); });
  // En móvil el primer toque gira la tarjeta; con ratón ya está girada, así que el clic abre la ficha
  card.addEventListener('click', () => {
    if (canHover || card.classList.contains('flipped')) open();
    else {
      document.querySelectorAll('.grad-card.flipped').forEach(c => c.classList.remove('flipped'));
      card.classList.add('flipped');
    }
  });
});
// Anillo 3D: las tarjetas giran alrededor de un eje inclinado, como un planeta.
// Gira solo, se puede pausar, arrastrar, mover con flechas o saltar a un becario con los puntos.
const gradGrid = document.querySelector('.grad-grid');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (gradGrid && !reduceMotion) {
  const stage = gradGrid.parentElement;
  const cards = [...gradGrid.querySelectorAll('.grad-card')];
  const step = 360 / cards.length;
  const SPEED = 9;        // grados por segundo: una vuelta cada 40 s
  const RESUME_MS = 3500; // tras usar los controles, vuelve a girar solo pasado este tiempo
  let angle = 0, target = null, last = 0, idleUntil = 0, front = -1;
  let userPaused = false, hovering = false, dragging = false, visible = false, raf = 0;

  const layoutOrbit = () => {
    const small = window.innerWidth < 600;
    const w = small ? 150 : 220;
    const h = Math.round(w * 1.25 + (small ? 135 : 125));
    const r = Math.round((w / 2) / Math.tan(Math.PI / cards.length) + (small ? 30 : 150));
    gradGrid.style.setProperty('--n', cards.length);
    gradGrid.style.setProperty('--card-w', `${w}px`);
    gradGrid.style.setProperty('--card-h', `${h}px`);
    gradGrid.style.setProperty('--r', `${r}px`);
    stage.style.setProperty('--card-h', `${h}px`);
  };
  layoutOrbit();
  gradGrid.classList.add('orbit');
  window.addEventListener('resize', layoutOrbit);

  // Controles: ← puntos → y pausa, más el nombre del becario que está al frente
  const controls = document.createElement('div');
  controls.className = 'orbit-controls';
  controls.innerHTML = `
    <button class="orbit-btn" type="button" data-dir="-1" aria-label="Becario anterior">←</button>
    <div class="orbit-dots" role="group" aria-label="Elegir becario"></div>
    <button class="orbit-btn" type="button" data-dir="1" aria-label="Becario siguiente">→</button>
    <button class="orbit-btn orbit-toggle" type="button" aria-pressed="false"><span aria-hidden="true">❚❚</span> <span class="orbit-toggle-text">Pausar giro</span></button>
    <p class="orbit-current" aria-live="polite"></p>`;
  stage.after(controls);
  const hint = document.createElement('p');
  hint.className = 'grad-stage-hint';
  hint.textContent = canHover ? 'Arrastra el anillo para girarlo · pasa el cursor sobre una tarjeta para ver más.' : 'Desliza para girar el anillo · toca una tarjeta para ver más.';
  controls.after(hint);

  const dotsBox = controls.querySelector('.orbit-dots');
  const dots = cards.map((card, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Ver a ${card.querySelector('h4').textContent}`);
    dot.addEventListener('click', () => goTo(i));
    dotsBox.append(dot);
    return dot;
  });
  const current = controls.querySelector('.orbit-current');
  const toggle = controls.querySelector('.orbit-toggle');

  // Ángulo del anillo que deja la tarjeta i al frente, por el camino más corto
  function goTo(i) {
    let a = -i * step;
    a += Math.round((angle - a) / 360) * 360;
    target = a;
    idleUntil = performance.now() + RESUME_MS;
    start();
  }
  controls.querySelectorAll('[data-dir]').forEach(btn => btn.addEventListener('click', () => {
    goTo((front + Number(btn.dataset.dir) + cards.length) % cards.length);
  }));
  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    toggle.setAttribute('aria-pressed', String(userPaused));
    toggle.firstElementChild.textContent = userPaused ? '▶' : '❚❚';
    toggle.querySelector('.orbit-toggle-text').textContent = userPaused ? 'Reanudar giro' : 'Pausar giro';
    start();
  });

  // Se detiene con el cursor encima, con una tarjeta girada o con la ficha abierta
  gradGrid.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovering = true; });
  gradGrid.addEventListener('pointerleave', () => { hovering = false; start(); });
  const held = () => hovering || dragging || userPaused || !!gradGrid.querySelector('.flipped') || gradDialog?.open || gradGrid.matches(':focus-within');

  // Arrastrar con ratón o dedo
  let startX = 0, startAngle = 0, moved = false;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true; moved = false; target = null;
    startX = e.clientX; startAngle = angle;
    stage.setPointerCapture(e.pointerId);
    start();
  });
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) { moved = true; stage.classList.add('dragging'); }
    if (moved) angle = startAngle + dx * 0.35;
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('dragging');
    if (moved) goTo(front); // al soltar, encaja la tarjeta más cercana al frente
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  // Un arrastre no debe contar como clic sobre una tarjeta
  stage.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);

  function render() {
    gradGrid.style.transform = `rotateX(-8deg) rotateY(${angle}deg)`;
    let best = -1, bestDepth = -2;
    cards.forEach((card, i) => {
      const depth = (Math.cos((i * step + angle) * Math.PI / 180) + 1) / 2;
      card.style.setProperty('--depth', depth.toFixed(3));
      if (depth > bestDepth) { bestDepth = depth; best = i; }
    });
    if (best !== front) {
      front = best;
      cards.forEach((c, i) => c.classList.toggle('is-front', i === front));
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === front)));
      const card = cards[front];
      current.innerHTML = '';
      current.append(card.querySelector('h4').textContent);
      const small = document.createElement('small');
      small.textContent = `${card.querySelector('.grad-summary p').textContent} · ${card.querySelector('.grad-summary small').textContent}`;
      current.append(small);
    }
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (target !== null && !dragging) {
      angle += (target - angle) * Math.min(1, dt * 7); // acercamiento suave
      if (Math.abs(target - angle) < 0.05) { angle = target; target = null; }
    } else if (!held() && now > idleUntil) {
      angle -= SPEED * dt;
    }
    render();
    // Mientras está detenido y sin nada que animar, el bucle se apaga; start() lo reanuda
    if (visible && !(target === null && !dragging && held())) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; }
  }
  function start() {
    if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); }
  }

  // Solo gira cuando el anillo está en pantalla (ahorra batería)
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(stage);

  gradGrid.addEventListener('click', () => requestAnimationFrame(start));
  gradGrid.addEventListener('focusout', () => requestAnimationFrame(start));
  gradDialog?.addEventListener('close', () => {
    gradGrid.querySelectorAll('.flipped').forEach(c => c.classList.remove('flipped'));
    start();
  });
  render();
}

gradDialog?.querySelector('.grad-dialog-close').addEventListener('click', () => gradDialog.close());
gradDialog?.addEventListener('click', e => { if (e.target === gradDialog) gradDialog.close(); });

document.getElementById('year').textContent = new Date().getFullYear();
