/* =====================================================================
    SYSTEM_DOCS — Script principal
    - 1. Modo Oscuro: toggle claro/oscuro y persistencia
    - 2. Buscador: filtro en vivo, autocompletado, mayúsculas/minúsculas/acentos
    - 3. Barra lateral (drawer): navegación en móvil/tablet
    - 4. Artículos recientes: rotación periódica automática (Vanilla JS)
    - 5. Artículo destacado (Hero): rotación periódica automática sin fecha (Vanilla JS)
    ===================================================================== */

(function () {
    'use strict';

    /* ----------------------------------------------------------------
        1. MODO OSCURO
        ---------------------------------------------------------------- */
    const root = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
    } else if (savedTheme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
    }

    // HABILITADO: toggle claro/oscuro — guarda en localStorage 'theme' (clase :root.light/:root.dark)
    function toggleTheme() {
        if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            root.classList.add('light');
            localStorage.setItem('theme', 'light');
        } else if (root.classList.contains('light')) {
            root.classList.remove('light');
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('light');
                localStorage.setItem('theme', 'light');
            } else {
                root.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
        }
    }
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        // HABILITADO: teclado Enter/Espacio (span role=button con tabindex=0)
        themeToggle.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    /* ----------------------------------------------------------------
        2. Buscador (filtro + autocompletado, sin distinguir mayúsculas)
        ---------------------------------------------------------------- */
    const searchInput = document.getElementById('siteSearch');
    const searchWrapper = document.querySelector('.search-wrapper');
    const suggestionsList = document.getElementById('searchSuggestions');
    const searchStatus = document.getElementById('searchStatus');
    const searchEmpty = document.getElementById('searchEmpty');
    const searchCount = document.getElementById('searchCount');
    const MAX_SUGGESTIONS = 8;

    function fold(str) {
        return String(str)
            .toLocaleLowerCase('es')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
    }

    function compact(str) {
        return fold(str).replace(/ /g, '');
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (ch) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[ch];
        });
    }

    function textOf(el, selector) {
        const node = el.querySelector(selector);
        return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    function collectEntries() {
        const nodes = document.querySelectorAll('.hero-article, .list-article, .concept-card');
        const entries = [];
        for (let i = 0; i < nodes.length; i++) {
            const el = nodes[i];
            const link = el.tagName === 'A' ? el : el.querySelector('a[href]');
            const title = textOf(el, '.hero-title, .list-title, .concept-title');
            if (!title) continue;
            const category = textOf(el, '.tag-primary, .category-text');
            const description = textOf(el, '.hero-description, .list-description, .concept-description');
            const haystack = title + ' ' + category + ' ' + description;
            entries.push({
                el: el,
                href: link ? link.getAttribute('href') : '',
                title: title,
                category: category,
                description: description,
                folded: fold(haystack),
                compact: compact(haystack)
            });
        }
        return entries;
    }

    function uniqueCatalog(entries) {
        const byHref = Object.create(null);
        const order = [];
        for (let i = 0; i < entries.length; i++) {
            const item = entries[i];
            const key = item.href || ('title:' + item.title);
            const existing = byHref[key];
            if (!existing) {
                byHref[key] = item;
                order.push(key);
            } else if (item.el.closest('#archivo')) {
                byHref[key] = item;
            }
        }
        return order.map(function (key) { return byHref[key]; });
    }

    function matchesQuery(item, query) {
        if (!query) return true;
        const qFold = fold(query);
        const qCompact = compact(query);
        if (!qFold) return true;
        return item.folded.indexOf(qFold) !== -1 || item.compact.indexOf(qCompact) !== -1;
    }

    function rankItem(item, query) {
        const qFold = fold(query);
        const qCompact = compact(query);
        const titleFold = fold(item.title);
        const titleCompact = compact(item.title);
        if (titleFold === qFold || titleCompact === qCompact) return 4;
        if (titleFold.indexOf(qFold) === 0 || titleCompact.indexOf(qCompact) === 0) return 3;
        if (titleFold.indexOf(qFold) !== -1 || titleCompact.indexOf(qCompact) !== -1) return 2;
        if (fold(item.category).indexOf(qFold) !== -1) return 1;
        return 0;
    }

    function highlightMatch(text, query) {
        const nQuery = fold(query);
        if (!nQuery) return escapeHtml(text);

        let folded = '';
        const map = [];
        for (let i = 0; i < text.length; i++) {
            const piece = String(text.charAt(i))
                .toLocaleLowerCase('es')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            const out = /[a-z0-9]/.test(piece) ? piece : ' ';
            for (let j = 0; j < out.length; j++) {
                map.push(i);
                folded += out.charAt(j);
            }
        }

        let from = folded.indexOf(nQuery);
        let span = nQuery.length;

        if (from === -1) {
            const compactFolded = folded.replace(/ /g, '');
            const compactQuery = nQuery.replace(/ /g, '');
            const compactFrom = compactFolded.indexOf(compactQuery);
            if (compactFrom === -1 || !compactQuery) return escapeHtml(text);
            let seen = 0;
            from = -1;
            span = 0;
            for (let i = 0; i < folded.length; i++) {
                if (folded.charAt(i) === ' ') continue;
                if (seen === compactFrom) from = i;
                if (seen === compactFrom + compactQuery.length - 1) {
                    span = i - from + 1;
                    break;
                }
                seen += 1;
            }
            if (from === -1) return escapeHtml(text);
        }

        const origStart = map[from];
        const origEnd = map[from + span - 1] + 1;
        return escapeHtml(text.slice(0, origStart)) +
            '<mark>' + escapeHtml(text.slice(origStart, origEnd)) + '</mark>' +
            escapeHtml(text.slice(origEnd));
    }

    let entries = [];

    function updateSearchEntry(el, title, category, description, href) {
        if (!entries || !entries.length) return;
        for (let i = 0; i < entries.length; i++) {
            if (entries[i].el === el) {
                entries[i].title = title;
                entries[i].category = category || '';
                entries[i].description = description || '';
                entries[i].href = href || '';
                const haystack = title + ' ' + (category || '') + ' ' + (description || '');
                entries[i].folded = fold(haystack);
                entries[i].compact = compact(haystack);
                break;
            }
        }
    }

    if (searchInput && searchWrapper && suggestionsList) {
        entries = collectEntries();
        const catalog = uniqueCatalog(entries);
        let activeIndex = -1;
        let currentMatches = [];

        /**
         * Actualiza el estado accesible del buscador en el elemento ARIA live region (searchStatus),
         * permitiendo que los lectores de pantalla anuncien el número de coincidencias al usuario.
         * @param {string} message - Mensaje a comunicar en el lector de pantalla.
         */
        function setStatus(message) {
            if (searchStatus) searchStatus.textContent = message;
        }

        /**
         * Cierra y limpia el menú flotante de sugerencias predictivas.
         * Oculta el contenedor, resetea el índice activo y sincroniza los atributos ARIA del input.
         */
        function closeSuggestions() {
            suggestionsList.hidden = true;
            suggestionsList.innerHTML = '';
            searchInput.setAttribute('aria-expanded', 'false');
            searchInput.setAttribute('aria-activedescendant', '');
            activeIndex = -1;
        }

        /**
         * Marca visualmente y mediante atributos de accesibilidad la sugerencia activa en la lista.
         * Soporta navegación cíclica con teclado (flechas arriba y abajo) y realiza scroll automático
         * para mantener el elemento visible en caso de desbordamiento.
         * @param {number} index - Índice numérico de la opción a activar.
         */
        function setActive(index) {
            const options = suggestionsList.querySelectorAll('[role="option"]');
            if (!options.length) {
                activeIndex = -1;
                searchInput.setAttribute('aria-activedescendant', '');
                return;
            }
            // Navegación cíclica si se llega al extremo superior o inferior
            if (index < 0) index = options.length - 1;
            if (index >= options.length) index = 0;
            activeIndex = index;

            // Actualizar clases y atributos aria-selected en cada opción
            for (let i = 0; i < options.length; i++) {
                const on = i === activeIndex;
                options[i].classList.toggle('is-active', on);
                options[i].setAttribute('aria-selected', on ? 'true' : 'false');
            }
            const current = options[activeIndex];
            searchInput.setAttribute('aria-activedescendant', current.id);
            if (typeof current.scrollIntoView === 'function') {
                current.scrollIntoView({ block: 'nearest' });
            }
        }

        /**
         * Redirige al usuario hacia el enlace del artículo seleccionado.
         * @param {Object} item - Objeto del artículo que contiene la propiedad href.
         */
        function goTo(item) {
            if (item && item.href) {
                window.location.href = item.href;
            }
        }

        /**
         * Aplica el filtrado reactivo en tiempo real sobre las publicaciones del DOM.
         * - Evalúa coincidencias de texto ignorando acentos y mayúsculas.
         * - Añade o retira la clase .is-search-hidden en cada tarjeta de artículo.
         * - Oculta secciones completas si ninguna de sus tarjetas coincide con la consulta.
         * - Controla la visibilidad del mensaje de archivo vacío (#searchEmpty) y el contador (#searchCount).
         * @param {string} query - Cadena de texto ingresada por el usuario en el buscador.
         * @returns {number} Cantidad total de artículos únicos visibles encontrados.
         */
        function applyFilter(query) {
            const q = query.trim();
            let visible = 0;
            const seenHref = Object.create(null);

            // 1. Filtrar cada tarjeta individual registrada en el catálogo
            for (let i = 0; i < entries.length; i++) {
                const item = entries[i];
                const match = matchesQuery(item, q);
                item.el.classList.toggle('is-search-hidden', Boolean(q) && !match);
                if (match && item.href && !seenHref[item.href]) {
                    seenHref[item.href] = true;
                    visible += 1;
                } else if (match && !item.href) {
                    visible += 1;
                }
            }

            // 2. Ocultar secciones completas (Hero, Artículos Recientes, Conceptos) si no tienen coincidencias
            const sections = document.querySelectorAll('.section-container');
            for (let s = 0; s < sections.length; s++) {
                const section = sections[s];
                if (section.id === 'archivo') continue; // El archivo se gestiona con su propia grilla
                const items = section.querySelectorAll('.hero-article, .list-article, .concept-card');
                if (!items.length) continue;
                let any = false;
                for (let j = 0; j < items.length; j++) {
                    if (!items[j].classList.contains('is-search-hidden')) {
                        any = true;
                        break;
                    }
                }
                section.classList.toggle('is-search-hidden', Boolean(q) && !any);
            }

            // 3. Gestionar la cuadrícula del archivo de publicaciones
            const archivo = document.getElementById('archivo');
            const archivoGrid = archivo ? archivo.querySelector('.concept-grid') : null;
            let archivoVisible = 0;
            if (archivoGrid) {
                const cards = archivoGrid.querySelectorAll('.concept-card');
                for (let c = 0; c < cards.length; c++) {
                    if (!cards[c].classList.contains('is-search-hidden')) archivoVisible += 1;
                }
                archivoGrid.classList.toggle('is-search-hidden', Boolean(q) && archivoVisible === 0);
            }

            // 4. Mostrar u ocultar mensaje de "No hay artículos que coincidan"
            if (searchEmpty) {
                searchEmpty.hidden = !(q && archivoVisible === 0);
            }

            // 5. Actualizar el indicador visual de cantidad de coincidencias
            if (searchCount) {
                if (q) {
                    searchCount.hidden = false;
                    searchCount.textContent = archivoVisible === 1
                        ? '1 coincidencia'
                        : archivoVisible + ' coincidencias';
                } else {
                    searchCount.hidden = true;
                    searchCount.textContent = '';
                }
            }

            // 6. Actualizar el lector de pantalla para personas con discapacidad visual
            if (!q) {
                setStatus('');
            } else if (visible === 0) {
                setStatus('Sin coincidencias para ' + q);
            } else {
                setStatus(visible === 1 ? '1 artículo encontrado' : visible + ' artículos encontrados');
            }

            return visible;
        }

        function renderSuggestions(query) {
            const q = query.trim();
            suggestionsList.innerHTML = '';
            currentMatches = [];
            if (!q) {
                closeSuggestions();
                return;
            }

            const scored = [];
            for (let i = 0; i < catalog.length; i++) {
                const item = catalog[i];
                if (!matchesQuery(item, q)) continue;
                scored.push({ item: item, score: rankItem(item, q) });
            }
            scored.sort(function (a, b) { return b.score - a.score; });
            currentMatches = scored.slice(0, MAX_SUGGESTIONS).map(function (row) { return row.item; });

            if (!currentMatches.length) {
                const empty = document.createElement('li');
                empty.className = 'search-suggestion search-suggestion-empty';
                empty.setAttribute('role', 'presentation');
                empty.textContent = 'Sin coincidencias';
                suggestionsList.appendChild(empty);
                suggestionsList.hidden = false;
                searchInput.setAttribute('aria-expanded', 'true');
                searchInput.setAttribute('aria-activedescendant', '');
                activeIndex = -1;
                return;
            }

            for (let i = 0; i < currentMatches.length; i++) {
                const item = currentMatches[i];
                const li = document.createElement('li');
                li.id = 'search-opt-' + i;
                li.className = 'search-suggestion';
                li.setAttribute('role', 'option');
                li.setAttribute('aria-selected', 'false');

                const title = document.createElement('span');
                title.className = 'search-suggestion-title';
                title.innerHTML = highlightMatch(item.title, q);

                li.appendChild(title);
                if (item.category) {
                    const meta = document.createElement('span');
                    meta.className = 'search-suggestion-meta';
                    meta.textContent = item.category;
                    li.appendChild(meta);
                }

                li.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    goTo(item);
                });
                li.addEventListener('mouseenter', function () {
                    setActive(i);
                });
                suggestionsList.appendChild(li);
            }

            suggestionsList.hidden = false;
            searchInput.setAttribute('aria-expanded', 'true');
            setActive(0);
        }

        function onQueryChange() {
            const query = searchInput.value;
            applyFilter(query);
            renderSuggestions(query);
        }

        searchWrapper.addEventListener('focusin', function () {
            searchWrapper.classList.add('is-focused');
        });
        searchWrapper.addEventListener('focusout', function (e) {
            if (!searchWrapper.contains(e.relatedTarget)) {
                searchWrapper.classList.remove('is-focused');
                closeSuggestions();
            }
        });

        searchInput.addEventListener('input', onQueryChange);
        searchInput.addEventListener('search', onQueryChange);

        searchInput.addEventListener('keydown', function (e) {
            const open = !suggestionsList.hidden;
            const options = suggestionsList.querySelectorAll('[role="option"]');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!open) {
                    renderSuggestions(searchInput.value);
                    return;
                }
                if (options.length) setActive(activeIndex + 1);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (open && options.length) setActive(activeIndex - 1);
                return;
            }
            if (e.key === 'Home' && open && options.length) {
                e.preventDefault();
                setActive(0);
                return;
            }
            if (e.key === 'End' && open && options.length) {
                e.preventDefault();
                setActive(options.length - 1);
                return;
            }
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (!query) return;
                e.preventDefault();
                if (open && activeIndex >= 0 && currentMatches[activeIndex]) {
                    goTo(currentMatches[activeIndex]);
                    return;
                }
                if (currentMatches[0]) {
                    goTo(currentMatches[0]);
                    return;
                }
                const archivo = document.getElementById('archivo');
                if (archivo) archivo.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
            if (e.key === 'Escape') {
                if (open) {
                    e.preventDefault();
                    closeSuggestions();
                    return;
                }
                if (searchInput.value) {
                    e.preventDefault();
                    searchInput.value = '';
                    onQueryChange();
                }
            }
        });

        document.addEventListener('click', function (e) {
            if (!searchWrapper.contains(e.target)) closeSuggestions();
        });
    }

    /* ----------------------------------------------------------------
        3. Navigation Drawer (barra lateral) en móvil/tablet
        ---------------------------------------------------------------- */
    const menuToggle = document.getElementById('menuToggle');
    const navDrawer  = document.getElementById('navDrawer');
    const navScrim   = document.getElementById('navScrim');

    if (menuToggle && navDrawer && navScrim) {

        const isDesktop = function () {
            return menuToggle.offsetWidth === 0;
        };

        const openDrawer = function () {
            navDrawer.classList.add('is-open');
            navScrim.classList.add('is-visible');
            menuToggle.setAttribute('aria-expanded', 'true');
            menuToggle.innerHTML = '<svg class="menu-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>';
            menuToggle.setAttribute('aria-label', 'Cerrar menú de navegación');
            document.body.style.overflow = 'hidden';
        };

        const closeDrawer = function () {
            navDrawer.classList.remove('is-open');
            navScrim.classList.remove('is-visible');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.innerHTML = '<svg class="menu-icon" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>';
            menuToggle.setAttribute('aria-label', 'Abrir menú de navegación');
            document.body.style.overflow = '';
        };

        const toggleDrawer = function () {
            if (isDesktop()) return;
            if (navDrawer.classList.contains('is-open')) {
                closeDrawer();
            } else {
                openDrawer();
            }
        };

        menuToggle.addEventListener('click', toggleDrawer);
        navScrim.addEventListener('click', closeDrawer);

        const navLinks = navDrawer.querySelectorAll('.nav-link');
        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                if (!isDesktop()) closeDrawer();
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && navDrawer.classList.contains('is-open')) {
                closeDrawer();
                menuToggle.focus();
            }
        });

        let resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (isDesktop() && navDrawer.classList.contains('is-open')) {
                    closeDrawer();
                }
            }, 150);
        });
    }

    /* ----------------------------------------------------------------
        4. ROTACIÓN PERIÓDICA DE ARTÍCULOS RECIENTES (JS PURO VANILLA)
        ----------------------------------------------------------------
        Este módulo gestiona la rotación automática y suave de los artículos
        en la sección "ARTÍCULOS RECIENTES" (#articulos):
        
        - Rota cada intervalo de tiempo (6000 ms = 6 segundos).
        - Aplica una transición suave de opacidad (fade out/in vía CSS .is-rotating).
        - Elimina cualquier elemento de fecha (.date-text).
        - Muestra la categoría sólo si existe; si no hay (o es placeholder),
          el contenedor de categoría (.category-text) queda completamente en blanco.
        - Pausa la rotación cuando el usuario pasa el mouse (mouseenter) o
          hace foco con el teclado (focusin) para facilitar la lectura.
        - Reanuda la rotación automáticamente al salir del elemento.
        - Pausa la rotación si el buscador está activo para no alterar la búsqueda.
        - Sincroniza el catálogo del buscador para que las coincidencias sean precisas.
        ---------------------------------------------------------------- */
    const recentArticlesSection = document.getElementById('articulos');

    if (recentArticlesSection) {
        // Obtenemos los dos elementos <article class="list-article"> existentes en el DOM
        const articleElements = recentArticlesSection.querySelectorAll('.list-article');

        // Colección de artículos con imágenes y datos reales del blog para la rotación
        const recentArticlesPool = [
            {
                title: 'Limpieza de ventiladores',
                href: 'articulos/Gu%C3%ADa%20Limpieza%20de%20ventiladores/Gu%C3%ADa%20Limpieza%20de%20ventiladores.html',
                image: 'articulos/Guía Limpieza de ventiladores/src/03-internal-cleaning.webp',
                alt: 'Imagen artículo Limpieza de ventiladores',
                category: 'MANTENIMIENTO',
                description: 'Cómo limpiar los ventiladores para evitar sobrecalentamiento y ruido.'
            },
            {
                title: 'Conceptos básicos',
                href: 'articulos/conceptos%20basicos/conceptos%20basicos.html',
                image: 'articulos/conceptos basicos/src/01-hero-computer.webp',
                alt: 'Imagen artículo Conceptos Básicos',
                category: 'FUNDAMENTOS',
                description: 'Los términos esenciales para empezar a usar la computadora con confianza.'
            },
            {
                title: 'Laboratorios y simuladores virtuales',
                href: 'articulos/Laboratorios%20y%20simuladores%20virtuales/Laboratorios%20y%20simuladores%20virtuales.html',
                image: 'articulos/Laboratorios y simuladores virtuales/src/laboratorio-virtual-simulacion-de-reaccion-quimica.webp',
                alt: 'Imagen artículo Laboratorios y simuladores virtuales',
                category: 'HERRAMIENTAS EDUCATIVAS', // Con categoría
                description: 'Experimenta sin riesgo con simuladores que reproducen fenómenos científicos de forma interactiva.'
            },
            {
                title: 'Reconocimiento Óptico de Caracteres (OCR)',
                href: 'articulos/Reconocimiento%20%C3%93ptico%20de%20Caracteres%20%28OCR%29/Reconocimiento%20%C3%93ptico%20de%20Caracteres%20%28OCR%29.html',
                image: 'articulos/Reconocimiento Óptico de Caracteres (OCR)/src/ocr-conversion-de-apuntes-a-texto-digital.webp',
                alt: 'Imagen artículo Reconocimiento Óptico de Caracteres (OCR)',
                category: 'PRODUCTIVIDAD DIGITAL', // Con categoría
                description: 'Convierte imágenes y escaneos en texto editable para digitalizar apuntes y guías.'
            },
            {
                title: 'Seguridad básica y Antivirus',
                href: 'articulos/Seguridad%20b%C3%A1sica%20y%20Antivirus/Seguridad%20b%C3%A1sica%20y%20Antivirus.html',
                image: 'articulos/Seguridad básica y Antivirus/src/01-hero-antivirus.webp',
                alt: 'Imagen artículo Seguridad básica y Antivirus',
                category: 'SEGURIDAD', // Con categoría
                description: 'Recomendaciones para proteger el equipo y la información.'
            },
            {
                title: 'Ergonomía y salud digital',
                href: 'articulos/Ergonom%C3%ADa%20y%20salud%20digital/Ergonom%C3%ADa%20y%20salud%20digital.html',
                image: 'articulos/Ergonomía y salud digital/src/01-hero-ergonomics.webp',
                alt: 'Imagen artículo Ergonomía y salud digital',
                category: 'SALUD DIGITAL', // Con categoría
                description: 'Hábitos para usar la tecnología de forma cómoda y segura.'
            },
            {
                title: 'Compresión de archivos y carpetas (ZIP/RAR)',
                href: 'articulos/Compresi%C3%B3n%20de%20archivos%20y%20carpetas%20%28ZIP-RAR%29/Compresi%C3%B3n%20de%20archivos%20y%20carpetas%20%28ZIP-RAR%29.html',
                image: 'articulos/Compresión de archivos y carpetas (ZIP-RAR)/src/compresion-de-archivos-y-carpetas-zip-rar-pasos.webp',
                alt: 'Imagen artículo Compresión de archivos y carpetas',
                category: 'GESTIÓN DE ARCHIVOS', // Con categoría
                description: 'Ahorra espacio y organiza entregas comprimiendo archivos en ZIP y RAR.'
            },
            {
                title: 'Limpieza física y prevención del thermal throttling',
                href: 'articulos/Limpieza%20f%C3%ADsica%20y%20prevenci%C3%B3n%20del%20thermal%20throttling/Limpieza%20f%C3%ADsica%20y%20prevenci%C3%B3n%20del%20thermal%20throttling.html',
                image: 'articulos/Limpieza física y prevención del thermal throttling/src/01-hero-thermal.jpg',
                alt: 'Imagen artículo Limpieza física y thermal throttling',
                category: 'MANTENIMIENTO',
                description: 'Cómo la limpieza interna evita el sobrecalentamiento y la pérdida de rendimiento.'
            },
            {
                title: 'Realidad Aumentada (AR) para el aprendizaje',
                href: 'articulos/Realidad%20Aumentada%20%28AR%29%20para%20el%20aprendizaje/Realidad%20Aumentada%20%28AR%29%20para%20el%20aprendizaje.html',
                image: 'articulos/Realidad Aumentada (AR) para el aprendizaje/src/realidad-aumentada-aprendizaje-3d-con-modelos-de-ciencia.webp',
                alt: 'Imagen artículo Realidad Aumentada (AR)',
                category: 'TECNOLOGÍA INMERSIVA', // Con categoría
                description: 'Superpone contenido 3D al mundo real para visualizar y comprender mejor.'
            },
            {
                title: 'Huella digital escolar',
                href: 'articulos/Huella%20digital%20escolar/Huella%20digital%20escolar.html',
                image: 'articulos/Huella digital escolar/src/huella-digital-escolar-internet-con-respeto-y-seguridad.webp',
                alt: 'Imagen artículo Huella digital escolar',
                category: 'CIUDADANÍA DIGITAL', // Con categoría
                description: 'Construye una reputación digital positiva con cada interacción en línea.'
            },
            {
                title: 'Redes domésticas y Wi-Fi',
                href: 'articulos/Redes%20dom%C3%A9sticas%20y%20Wi-Fi/Redes%20dom%C3%A9sticas%20y%20Wi-Fi.html',
                image: 'articulos/Redes domésticas y Wi-Fi/src/01-hero-wifi.webp',
                alt: 'Imagen artículo Redes domésticas y Wi-Fi',
                category: 'REDES',
                description: 'Configura y protege tu red Wi-Fi para una conexión estable en casa.'
            },
            {
                title: 'Protección contra estafas en línea (Phishing)',
                href: 'articulos/Protecci%C3%B3n%20contra%20estafas%20en%20l%C3%ADnea%20(Phishing)/Protecci%C3%B3n%20contra%20estafas%20en%20l%C3%ADnea%20(Phishing).html',
                image: 'articulos/Protección contra estafas en línea (Phishing)/src/01-hero-phishing.webp',
                alt: 'Imagen artículo Phishing',
                category: 'SEGURIDAD',
                description: 'Aprende a detectar correos y mensajes engañosos antes de caer en la trampa.'
            }
        ];

        // Solo inicializar si hay al menos 2 elementos en la página
        if (articleElements.length >= 2) {
            const ROTATION_INTERVAL = 6000; // Intervalo de 6 segundos entre cada rotación
            let currentPairIndex = 0;        // Índice del par actual (0, 1, 2, 3...)
            let timerId = null;              // Referencia al temporizador setInterval
            let isUserInteracting = false;   // Estado para pausar si el usuario interactúa

            const totalPairs = Math.floor(recentArticlesPool.length / 2);

            /**
             * Actualiza el contenido visual de un elemento de artículo con los nuevos datos.
             * @param {HTMLElement} cardEl - Elemento <article class="list-article">.
             * @param {Object} data - Objeto con los datos del artículo (título, imagen, etc.).
             */
            function updateCardContent(cardEl, data) {
                if (!cardEl || !data) return;

                // 1. Actualizar imagen y texto alternativo
                const img = cardEl.querySelector('.list-image');
                if (img) {
                    img.src = data.image;
                    img.alt = data.alt || ('Imagen artículo ' + data.title);
                }

                // 2. Gestionar la categoría:
                // Si existe y no es placeholder, la muestra; de lo contrario queda en blanco.
                const catEl = cardEl.querySelector('.category-text');
                if (catEl) {
                    const cat = (data.category || '').trim();
                    const isPlaceholder = cat.toUpperCase().includes('PLACEHOLDER');
                    catEl.textContent = (!cat || isPlaceholder) ? '' : cat;
                }

                // 3. Eliminar cualquier elemento de fecha para asegurar que no se muestre
                const dateEl = cardEl.querySelector('.date-text');
                if (dateEl) {
                    dateEl.remove();
                }

                // 4. Actualizar el enlace y el título del artículo
                const linkEl = cardEl.querySelector('.list-title a');
                if (linkEl) {
                    linkEl.href = data.href;
                    linkEl.textContent = data.title;
                }

                // 5. Actualizar la descripción del artículo
                const descEl = cardEl.querySelector('.list-description');
                if (descEl) {
                    descEl.textContent = data.description;
                }

                // 6. Sincronizar el catálogo en memoria del buscador para coherencia en filtros
                updateSearchEntry(cardEl, data.title, data.category, data.description, data.href);
            }

            /**
             * Muestra un par de artículos dado su índice, opcionalmente con animación de fade.
             * @param {number} pairIdx - Índice del par a mostrar.
             * @param {boolean} animate - Si true, ejecuta una transición suave de opacidad.
             */
            function showPair(pairIdx, animate) {
                const idxA = (pairIdx * 2) % recentArticlesPool.length;
                const idxB = (pairIdx * 2 + 1) % recentArticlesPool.length;
                const dataA = recentArticlesPool[idxA];
                const dataB = recentArticlesPool[idxB];

                if (animate) {
                    // Fase 1: Desvanecer (fade out) mediante clase CSS .is-rotating
                    for (let i = 0; i < articleElements.length; i++) {
                        articleElements[i].classList.add('is-rotating');
                    }

                    // Fase 2: Tras 350ms (fin del fade out), actualizar contenido y hacer fade in
                    setTimeout(function () {
                        updateCardContent(articleElements[0], dataA);
                        updateCardContent(articleElements[1], dataB);

                        for (let i = 0; i < articleElements.length; i++) {
                            articleElements[i].classList.remove('is-rotating');
                        }
                    }, 350);
                } else {
                    // Sin animación (por ejemplo, en la carga inicial de la página)
                    updateCardContent(articleElements[0], dataA);
                    updateCardContent(articleElements[1], dataB);
                }
            }

            /**
             * Avanza al siguiente par de artículos cíclicamente.
             */
            function advanceToNextPair() {
                // Si el usuario tiene una búsqueda activa en el input, no rotamos
                if (searchInput && searchInput.value.trim().length > 0) return;
                // Si el usuario tiene el mouse encima o el foco activo, no rotamos
                if (isUserInteracting) return;

                currentPairIndex = (currentPairIndex + 1) % totalPairs;
                showPair(currentPairIndex, true);
            }

            /**
             * Inicia o reinicia el temporizador de rotación periódica.
             */
            function startRotationTimer() {
                stopRotationTimer();
                timerId = setInterval(advanceToNextPair, ROTATION_INTERVAL);
            }

            /**
             * Detiene el temporizador de rotación periódica.
             */
            function stopRotationTimer() {
                if (timerId) {
                    clearInterval(timerId);
                    timerId = null;
                }
            }

            // Aplicar renderizado inicial para limpiar fechas y categorías de inmediato
            showPair(0, false);
            startRotationTimer();

            // --- Control de interacción para accesibilidad y usabilidad ---
            // Al pasar el mouse por la sección de artículos, pausar el carrusel
            recentArticlesSection.addEventListener('mouseenter', function () {
                isUserInteracting = true;
                stopRotationTimer();
            });

            // Al retirar el mouse de la sección, reanudar el carrusel
            recentArticlesSection.addEventListener('mouseleave', function () {
                isUserInteracting = false;
                startRotationTimer();
            });

            // Al hacer foco con el teclado (accesibilidad por tabulación), pausar
            recentArticlesSection.addEventListener('focusin', function () {
                isUserInteracting = true;
                stopRotationTimer();
            });

            // Al perder el foco de los elementos dentro de la sección, reanudar
            recentArticlesSection.addEventListener('focusout', function (e) {
                if (!recentArticlesSection.contains(e.relatedTarget)) {
                    isUserInteracting = false;
                    startRotationTimer();
                }
            });

            // Si el usuario cambia de pestaña en el navegador, detener el timer para ahorrar recursos
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) {
                    stopRotationTimer();
                } else if (!isUserInteracting) {
                    startRotationTimer();
                }
            });
        }
    }

    /* ----------------------------------------------------------------
        5. ROTACIÓN PERIÓDICA DE ARTÍCULO DESTACADO (HERO - JS PURO VANILLA)
        ----------------------------------------------------------------
        Este módulo gestiona la rotación automática y suave del artículo
        principal destacado (.hero-article) ubicado en la sección #inicio:

        - Rota cada intervalo de tiempo (8000 ms = 8 segundos).
        - Desvanecimiento suave mediante CSS (clase .hero-article.is-rotating).
        - No muestra fecha: elimina cualquier elemento .date-text.
        - Mantiene la etiqueta "DESTACADO" visible.
        - Pausa cuando el usuario interactúa (hover o focus).
        - Pausa si hay una búsqueda activa en el buscador.
        - Sincroniza la entrada del artículo con el buscador.
        ---------------------------------------------------------------- */
    const heroArticle = document.querySelector('.hero-article');

    if (heroArticle) {
        // Colección de artículos destacados con datos reales del blog para la rotación del Hero
        const heroArticlesPool = [
            {
                title: 'Mantenimiento de hardware',
                href: 'articulos/articuloMantenimiento%20de%20hardware/Mantenimiento%20de%20hardware.html',
                image: 'articulos/articuloMantenimiento de hardware/src/01-hero-disk-fragmentation.jpg',
                alt: 'Imagen destacada Mantenimiento de Hardware',
                description: 'Un párrafo introductorio de ejemplo para el artículo destacado. Aquí se explica brevemente de qué trata el contenido principal para enganchar al lector.'
            },
            {
                title: 'Seguridad básica y Antivirus',
                href: 'articulos/Seguridad%20b%C3%A1sica%20y%20Antivirus/Seguridad%20b%C3%A1sica%20y%20Antivirus.html',
                image: 'articulos/Seguridad básica y Antivirus/src/01-hero-antivirus.webp',
                alt: 'Imagen destacada Seguridad básica y Antivirus',
                description: 'Recomendaciones fundamentales para proteger tu equipo y tu información frente a amenazas digitales y virus.'
            },
            {
                title: 'Ergonomía y salud digital',
                href: 'articulos/Ergonom%C3%ADa%20y%20salud%20digital/Ergonom%C3%ADa%20y%20salud%20digital.html',
                image: 'articulos/Ergonomía y salud digital/src/01-hero-ergonomics.webp',
                alt: 'Imagen destacada Ergonomía y salud digital',
                description: 'Hábitos posturales y pausas activas para usar la tecnología de forma cómoda, saludable y segura en el día a día.'
            },
            {
                title: 'Redes domésticas y Wi-Fi',
                href: 'articulos/Redes%20dom%C3%A9sticas%20y%20Wi-Fi/Redes%20dom%C3%A9sticas%20y%20Wi-Fi.html',
                image: 'articulos/Redes domésticas y Wi-Fi/src/01-hero-wifi.webp',
                alt: 'Imagen destacada Redes domésticas y Wi-Fi',
                description: 'Ajustes clave y recomendaciones prácticas de configuración para optimizar la velocidad y seguridad de tu red Wi-Fi.'
            },
            {
                title: 'Inteligencia Artificial como tutor personal',
                href: 'articulos/Inteligencia%20Artificial%20como%20tutor%20personal/Inteligencia%20Artificial%20como%20tutor%20personal.html',
                image: 'articulos/Inteligencia Artificial como tutor personal/src/comparacion-de-asistentes-de-ia-para-computacion.webp',
                alt: 'Imagen destacada Inteligencia Artificial como tutor personal',
                description: 'Personaliza tu aprendizaje aprovechando herramientas de inteligencia artificial como guía educativa interactiva.'
            },
            {
                title: 'Impacto real de ampliar la memoria RAM',
                href: 'articulos/Impacto%20real%20de%20ampliar%20la%20memoria%20RAM/Impacto%20real%20de%20ampliar%20la%20memoria%20RAM.html',
                image: 'articulos/Impacto real de ampliar la memoria RAM/src/01-hero-ram-upgrade.jpg',
                alt: 'Imagen destacada Impacto real de ampliar la memoria RAM',
                description: 'Descubre cómo influye el aumento de memoria RAM en el rendimiento multitarea y la fluidez del equipo.'
            }
        ];

        const HERO_ROTATION_INTERVAL = 8000; // 8 segundos
        let currentHeroIndex = 0;
        let heroTimerId = null;
        let isHeroInteracting = false;

        /**
         * Actualiza el contenido visual del artículo destacado (Hero).
         * @param {Object} data - Datos del artículo a mostrar.
         */
        function updateHeroContent(data) {
            if (!data) return;

            // 1. Actualizar imagen del Hero
            const img = heroArticle.querySelector('.hero-image');
            if (img) {
                img.src = data.image;
                img.alt = data.alt || ('Imagen destacada ' + data.title);
            }

            // 2. Asegurar que no haya fecha en los metadatos del Hero
            const dateEl = heroArticle.querySelector('.date-text');
            if (dateEl) {
                dateEl.remove();
            }

            // 3. Actualizar el título
            const titleEl = heroArticle.querySelector('.hero-title');
            if (titleEl) {
                titleEl.textContent = data.title;
            }

            // 4. Actualizar la descripción
            const descEl = heroArticle.querySelector('.hero-description');
            if (descEl) {
                descEl.textContent = data.description;
            }

            // 5. Actualizar el enlace "LEER ARTÍCULO"
            const linkEl = heroArticle.querySelector('.read-more-link');
            if (linkEl) {
                linkEl.href = data.href;
            }

            // 6. Sincronizar en memoria con el buscador
            updateSearchEntry(heroArticle, data.title, 'DESTACADO', data.description, data.href);
        }

        /**
         * Muestra el artículo destacado correspondiente al índice dado con transición opcional.
         * @param {number} idx - Índice del artículo en el pool.
         * @param {boolean} animate - Si true, ejecuta fade out / fade in.
         */
        function showHeroArticle(idx, animate) {
            const data = heroArticlesPool[idx % heroArticlesPool.length];

            if (animate) {
                // Fase 1: Desvanecer suavemente
                heroArticle.classList.add('is-rotating');

                // Fase 2: Tras 350ms, cambiar contenido y reaparecer suavemente
                setTimeout(function () {
                    updateHeroContent(data);
                    heroArticle.classList.remove('is-rotating');
                }, 350);
            } else {
                updateHeroContent(data);
            }
        }

        /**
         * Avanza al siguiente artículo destacado de forma cíclica.
         */
        function advanceHero() {
            // No rotar si el buscador está activo o si el usuario está interactuando
            if (searchInput && searchInput.value.trim().length > 0) return;
            if (isHeroInteracting) return;

            currentHeroIndex = (currentHeroIndex + 1) % heroArticlesPool.length;
            showHeroArticle(currentHeroIndex, true);
        }

        function startHeroTimer() {
            stopHeroTimer();
            heroTimerId = setInterval(advanceHero, HERO_ROTATION_INTERVAL);
        }

        function stopHeroTimer() {
            if (heroTimerId) {
                clearInterval(heroTimerId);
                heroTimerId = null;
            }
        }

        // Render inicial para garantizar limpieza de fecha
        showHeroArticle(0, false);
        startHeroTimer();

        // Control de interacción: pausar al pasar el cursor
        heroArticle.addEventListener('mouseenter', function () {
            isHeroInteracting = true;
            stopHeroTimer();
        });

        heroArticle.addEventListener('mouseleave', function () {
            isHeroInteracting = false;
            startHeroTimer();
        });

        // Pausar al hacer foco por teclado
        heroArticle.addEventListener('focusin', function () {
            isHeroInteracting = true;
            stopHeroTimer();
        });

        heroArticle.addEventListener('focusout', function (e) {
            if (!heroArticle.contains(e.relatedTarget)) {
                isHeroInteracting = false;
                startHeroTimer();
            }
        });

        // Pausar si la pestaña se oculta
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                stopHeroTimer();
            } else if (!isHeroInteracting) {
                startHeroTimer();
            }
        });
    }
})();
