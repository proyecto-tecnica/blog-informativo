/* =====================================================================
    SYSTEM_DOCS — Script principal
    - Buscador: filtro en vivo, autocompletado, mayúsculas/minúsculas/acentos
    - Toggle de la barra lateral (drawer) en móvil/tablet
    - Toggle de Modo Oscuro
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

    if (searchInput && searchWrapper && suggestionsList) {
        const entries = collectEntries();
        const catalog = uniqueCatalog(entries);
        let activeIndex = -1;
        let currentMatches = [];

        function setStatus(message) {
            if (searchStatus) searchStatus.textContent = message;
        }

        function closeSuggestions() {
            suggestionsList.hidden = true;
            suggestionsList.innerHTML = '';
            searchInput.setAttribute('aria-expanded', 'false');
            searchInput.setAttribute('aria-activedescendant', '');
            activeIndex = -1;
        }

        function setActive(index) {
            const options = suggestionsList.querySelectorAll('[role="option"]');
            if (!options.length) {
                activeIndex = -1;
                searchInput.setAttribute('aria-activedescendant', '');
                return;
            }
            if (index < 0) index = options.length - 1;
            if (index >= options.length) index = 0;
            activeIndex = index;
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

        function goTo(item) {
            if (item && item.href) {
                window.location.href = item.href;
            }
        }

        function applyFilter(query) {
            const q = query.trim();
            let visible = 0;
            const seenHref = Object.create(null);

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

            const sections = document.querySelectorAll('.section-container');
            for (let s = 0; s < sections.length; s++) {
                const section = sections[s];
                if (section.id === 'archivo') continue;
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
            if (searchEmpty) {
                searchEmpty.hidden = !(q && archivoVisible === 0);
            }
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
})();
