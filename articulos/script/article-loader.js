const ASSETS_BASE = 'assets/images/';
const CONFIG_BASE = 'config/';
const PLACEHOLDER = 'placeholder.jpg';

const FALLBACK_ARTICLES = [
  { slug: 'mantenimiento-hardware', title: 'Mantenimiento de hardware', path: 'articuloMantenimiento de hardware/Mantenimiento de hardware.html' },
  { slug: 'conceptos-basicos', title: 'Conceptos básicos', path: 'conceptos basicos/conceptos basicos.html' },
  { slug: 'ergonomia-salud-digital', title: 'Ergonomía y salud digital', path: 'Ergonomía y salud digital/Ergonomía y salud digital.html' },
  { slug: 'guia-limpieza-de-ventiladores', title: 'Limpieza de ventiladores', path: 'Guía Limpieza de ventiladores/Guía Limpieza de ventiladores.html' },
  { slug: 'copias-de-seguridad-backups-simplificadas', title: 'Copias de seguridad (Backups) simplificadas', path: 'Copias de seguridad (Backups) simplificadas/Copias de seguridad (Backups) simplificadas.html' },
  { slug: 'descargas-seguras-en-internet', title: 'Descargas seguras en internet', path: 'Descargas seguras en internet/Descargas seguras en internet.html' },
  { slug: 'limpieza-fisica-prevencion-thermal-throttling', title: 'Limpieza física y prevención del thermal throttling', path: 'Limpieza física y prevención del thermal throttling/Limpieza física y prevención del thermal throttling.html' },
  { slug: 'optimizacion-sistema-cuidado-bateria', title: 'Optimización del sistema y cuidado de la batería', path: 'Optimización del sistema y cuidado de la batería/Optimización del sistema y cuidado de la batería.html' },
  { slug: 'proteccion-estafas-linea-phishing', title: 'Protección contra estafas en línea (Phishing)', path: 'Protección contra estafas en línea (Phishing)/Protección contra estafas en línea (Phishing).html' },
  { slug: 'redes-domesticas-wifi', title: 'Redes domésticas y Wi-Fi', path: 'Redes domésticas y Wi-Fi/Redes domésticas y Wi-Fi.html' },
  { slug: 'seguridad-basica-antivirus', title: 'Seguridad básica y Antivirus', path: 'Seguridad básica y Antivirus/Seguridad básica y Antivirus.html' },
  { slug: 'tecnologia-verde-e-waste', title: 'Tecnología verde y E-waste', path: 'Tecnología verde y E-waste/Tecnología verde y E-waste.html' },
  { slug: 'actualizaciones-criticas-seguridad-sistema', title: 'Actualizaciones críticas y seguridad del sistema', path: 'Actualizaciones críticas y seguridad del sistema/Actualizaciones críticas y seguridad del sistema.html' },
  { slug: 'cuidado-preventivo-accidentes-transporte', title: 'Cuidado preventivo frente a accidentes y transporte', path: 'Cuidado preventivo frente a accidentes y transporte/Cuidado preventivo frente a accidentes y transporte.html' },
  { slug: 'atajos-teclado-trucos-productividad', title: 'Atajos de teclado y trucos de productividad', path: 'Atajos de teclado y trucos de productividad/Atajos de teclado y trucos de productividad.html' }
];

let loadedConfig = {};

async function loadArticle(slug) {
  try {
    const res = await fetch(`${CONFIG_BASE}${slug}.json`);
    if (!res.ok) {
      return redirectToStaticArticle(slug);
    }

    const config = await res.json();
    loadedConfig = config;
    renderArticle(config);
  } catch (err) {
    return redirectToStaticArticle(slug);
  }
}

function renderArticle(config) {
  document.getElementById('page-title').textContent = `${config.title} | Blog Informativo`;
  document.getElementById('site-title').textContent = 'Blog Informativo';
  renderNav();
  renderBody(config);
  renderSidebar(config);
  initThemeToggle();
}

function renderNav() {
  const nav = document.getElementById('main-nav');
  nav.innerHTML = `
    <a href="../../index.html#inicio">Inicio</a>
    <a href="../../index.html#articulos">Reseñas</a>
    <a href="../../index.html#articulos">Noticias</a>
    <a href="../../index.html#conceptos">Tutoriales</a>
  `;
}

function renderBody(config) {
  const body = document.getElementById('article-body');
  const heroImg = config.images?.find(i => i.type === 'hero') || config.images?.[0];
  const heroSrc = heroImg ? `${ASSETS_BASE}${config.slug}/${heroImg.src}` : '';
  
  body.innerHTML = `
    <header class="article-title-block">
      <p class="font-label text-dim">${config.category || 'ARTÍCULO TÉCNICO'}</p>
      <h1 class="font-headline-lg">${escapeHtml(config.title)}</h1>
      <div class="metadata-bar font-label text-dim">
        <span>📅 ${config.date || 'Fecha'}</span>
        <span class="separator">|</span>
        <span>👤 ${config.author || 'Autor'}</span>
        <span class="separator">|</span>
        <span>📁 ${config.category || 'Categoría'}</span>
      </div>
    </header>
    ${heroSrc ? `
      <figure class="article-figure article-figure-featured">
        <img src="${heroSrc}" alt="${escapeHtml(heroImg.alt)}" loading="eager" onerror="this.src='${ASSETS_BASE}${config.slug}/${PLACEHOLDER}'">
        <figcaption>${escapeHtml(heroImg.caption || '')}</figcaption>
      </figure>
    ` : ''}
    ${config.sections.map(section => renderSection(config, section)).join('')}
  `;
}

function renderSection(config, section) {
  const headingTag = section.level === 2 ? 'h2' : 'h3';
  const headingClass = section.level === 2 ? 'article-subheading' : '';
  let html = '';

  if (section.imageId) {
    const img = config.images?.find(i => i.id === section.imageId);
    if (img) {
      html += `
        <figure class="article-figure">
          <img src="${ASSETS_BASE}${config.slug}/${img.src}" alt="${escapeHtml(img.alt)}" loading="lazy" onerror="this.src='${ASSETS_BASE}${config.slug}/${PLACEHOLDER}'">
          <figcaption>${escapeHtml(img.caption || '')}</figcaption>
        </figure>
      `;
    }
  }

  if (section.title) {
    html += `<${headingTag} class="${headingClass}">${escapeHtml(section.title)}</${headingTag}>`;
  }
  
  if (section.content) {
    const paragraphs = section.content.split('\n\n').filter(p => p.trim());
    html += `<section class="article-section">${paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}</section>`;
  }
  
  if (section.list) {
    html += `<section class="article-section"><ul class="article-list">${section.list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`;
  }
  
  return html;
}

function renderSidebar(config) {
  const sidebar = document.getElementById('article-sidebar');
  sidebar.innerHTML = `
    <div class="wireframe-box aspect-video flex-center" style="border: 2px dashed var(--surface-dim); background: var(--surface-low); border-radius: 4px;">
      <svg class="text-dim" height="40" viewBox="0 0 40 40" width="40"><path d="M0 0 L40 40 M40 0 L0 40" stroke="currentColor" stroke-width="1"></path></svg>
    </div>
    <div class="sidebar-widget bg-lowest">
      <div class="search-box-placeholder font-label uppercase text-dim font-bold text-xs" style="height: 40px; border: 1px solid var(--surface-dim); display: flex; align-items: center; padding: 0 16px;">Barra de Búsqueda</div>
    </div>
    <div class="sidebar-widget bg-lowest">
      <h3 class="font-label uppercase tracking-widest mb-sm">Entradas Recientes</h3>
      <ul class="related-list" id="recent-list"></ul>
    </div>
    <div class="sidebar-widget bg-lowest">
      <h3 class="font-label uppercase tracking-widest mb-sm">Categorías Populares</h3>
      <div class="tags-group" id="tags-group"></div>
    </div>
    <div class="sidebar-widget bg-lowest text-center">
      <h3 class="font-label uppercase tracking-widest mb-sm">Suscripción al Boletín</h3>
      <div class="skeleton-button" style="height: 32px; background: var(--primary); border-radius: 4px; width: 100%; opacity: 0.8;"></div>
    </div>
  `;
  loadRecentArticles();
}

async function loadRecentArticles() {
  const list = document.getElementById('recent-list');
  if (!list) return;

  try {
    const res = await fetch(`${CONFIG_BASE}index.json`);
    const data = await res.json();
    if (data.recent) {
      list.innerHTML = data.recent.slice(0, 3).map(r => 
        `<li><a href="plantilla-articulo.html?slug=${r.slug}">${escapeHtml(r.title)}</a></li>`
      ).join('');
      return;
    }
  } catch (e) {
    console.warn('No se pudo cargar index.json para artículos recientes');
  }

  list.innerHTML = FALLBACK_ARTICLES.slice(0, 3).map(r =>
    `<li><a href="${r.path}">${escapeHtml(r.title)}</a></li>`
  ).join('');
}

function initThemeToggle() {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('theme');
  
  if (stored === 'dark') {
    root.classList.add('dark');
  } else if (stored === 'light') {
    root.classList.remove('dark');
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const dark = root.classList.toggle('dark');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
      toggle.setAttribute('aria-pressed', String(dark));
    });
    toggle.setAttribute('aria-pressed', String(root.classList.contains('dark')));
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findStaticArticlePath(slug) {
  const normalized = normalizeSlug(slug);
  const fallback = FALLBACK_ARTICLES.find(entry => normalizeSlug(entry.slug) === normalized);
  return fallback ? fallback.path : null;
}

function redirectToStaticArticle(slug) {
  const fallbackPath = findStaticArticlePath(slug);
  if (fallbackPath) {
    window.location.href = fallbackPath;
    return true;
  }

  const body = document.getElementById('article-body');
  if (body) {
    body.innerHTML = `
      <div class="wireframe-box text-center py-large" style="border: 2px dashed var(--surface-dim); background: var(--surface-low); border-radius: 4px;">
        <h1 class="font-headline-lg uppercase tracking-tight">Error cargando artículo</h1>
        <p class="text-dim">No se encontró la configuración para: ${escapeHtml(slug)}.</p>
        <p class="text-dim">Si este artículo existe, revisa la carpeta <strong>articulos/config/</strong> y crea el archivo JSON correspondiente.</p>
      </div>
    `;
  }

  return false;
}

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug') || 'plantilla';
loadArticle(slug).catch(err => {
  console.error(err);
  redirectToStaticArticle(slug);
});
