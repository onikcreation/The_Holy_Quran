// ============================================================
// surah-list.js — v1.0
// Controls the Surah List page (index.html)
// Handles: data loading, card rendering, search, language &
//          theme toggling, localStorage caching via api.js
// ============================================================

'use strict';

// -------------------------------------------------------
// State
// -------------------------------------------------------
let allSurahs = [];          // full list fetched from API
let filteredSurahs = [];     // subset after search filter
let currentLang = 'bn';      // 'bn' (Bengali) | 'en' (English)
let searchDebounceTimer = null;

// -------------------------------------------------------
// DOM references (resolved after DOMContentLoaded)
// -------------------------------------------------------
let surahGrid, loadingState, errorState, noResults;
let searchInput, searchClear, searchCount;
let langToggle, themeToggle, retryBtn, errorMsg;

// -------------------------------------------------------
// Initialise on page load
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Grab all DOM nodes once
    surahGrid    = document.getElementById('surah-grid');
    loadingState = document.getElementById('loading-state');
    errorState   = document.getElementById('error-state');
    noResults    = document.getElementById('no-results');
    searchInput  = document.getElementById('search-input');
    searchClear  = document.getElementById('search-clear');
    searchCount  = document.getElementById('search-count');
    langToggle   = document.getElementById('lang-toggle');
    themeToggle  = document.getElementById('theme-toggle');
    retryBtn     = document.getElementById('retry-btn');
    errorMsg     = document.getElementById('error-msg');

    // 1. Apply saved theme (or system preference)
    initTheme();

    // 2. Apply saved language
    currentLang = localStorage.getItem('quran_lang') || 'bn';
    applyLanguage();

    // 3. Show skeleton while loading
    renderSkeletons(12);

    // 4. Fetch surah list
    loadSurahs();

    // 5. Wire up event listeners
    searchInput.addEventListener('input', onSearchInput);
    searchClear.addEventListener('click', clearSearch);
    langToggle.addEventListener('click', toggleLanguage);
    themeToggle.addEventListener('click', toggleTheme);
    retryBtn.addEventListener('click', loadSurahs);
});

// -------------------------------------------------------
// Theme management
// -------------------------------------------------------
function initTheme() {
    // Check localStorage first; fall back to system preference
    const saved = localStorage.getItem('quran_theme');
    if (saved) {
        setTheme(saved);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Update icon: moon for light mode (invite to switch to dark), sun for dark mode
    if (themeToggle) {
        themeToggle.querySelector('.theme-icon').textContent = (theme === 'dark') ? '☀️' : '🌙';
        themeToggle.setAttribute('title', theme === 'dark' ? 'Light mode-এ যান' : 'Dark mode-এ যান');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('quran_theme', next);
}

// -------------------------------------------------------
// Language management
// -------------------------------------------------------
function applyLanguage() {
    // Update toggle button label
    langToggle.textContent = currentLang === 'bn' ? 'EN' : 'বাং';
    langToggle.setAttribute('title', currentLang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন');

    // Update search placeholder
    searchInput.placeholder = currentLang === 'bn'
        ? 'সূরার নাম বা নম্বর দিয়ে খুঁজুন...'
        : 'Search by name or number...';

    // Update all data-bn / data-en elements on the page
    document.querySelectorAll('[data-bn]').forEach(el => {
        el.textContent = currentLang === 'bn'
            ? el.getAttribute('data-bn')
            : el.getAttribute('data-en');
    });

    // Re-render cards if data is already loaded (to swap name display)
    if (filteredSurahs.length > 0) {
        renderCards(filteredSurahs);
    }
}

function toggleLanguage() {
    currentLang = currentLang === 'bn' ? 'en' : 'bn';
    localStorage.setItem('quran_lang', currentLang);
    applyLanguage();
}

// -------------------------------------------------------
// Loading skeleton — shown while API call is in flight
// -------------------------------------------------------
function renderSkeletons(count) {
    loadingState.innerHTML = Array.from({ length: count }, () => `
        <div class="skeleton-card">
            <div class="skeleton skeleton-circle"></div>
            <div class="skeleton-body">
                <div class="skeleton skeleton-line skeleton-line-lg skeleton-line-w70"></div>
                <div class="skeleton skeleton-line skeleton-line-w50"></div>
                <div class="skeleton skeleton-line skeleton-line-w40"></div>
            </div>
        </div>
    `).join('');

    loadingState.classList.remove('hidden');
    surahGrid.classList.add('hidden');
    errorState.classList.add('hidden');
    noResults.classList.add('hidden');
}

// -------------------------------------------------------
// Fetch surah list from API (via api.js)
// -------------------------------------------------------
async function loadSurahs() {
    renderSkeletons(12);

    try {
        allSurahs = await getAllSurahs();   // defined in api.js
        filteredSurahs = allSurahs;

        loadingState.classList.add('hidden');
        renderCards(allSurahs);
    } catch (err) {
        loadingState.classList.add('hidden');
        showError(err.message);
    }
}

// -------------------------------------------------------
// Render surah cards into the grid
// -------------------------------------------------------
function renderCards(surahs) {
    if (surahs.length === 0) {
        surahGrid.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }

    noResults.classList.add('hidden');

    // Decide which name gets prominence based on current language
    surahGrid.innerHTML = surahs.map(s => {
        const revType = s.revelationType;                       // 'Meccan' | 'Medinan'
        const tagClass = revType === 'Meccan' ? 'tag-mekki' : 'tag-madani';
        const tagLabel = currentLang === 'bn'
            ? (revType === 'Meccan' ? 'মক্কী' : 'মাদানী')
            : revType;

        const primaryName   = currentLang === 'bn' ? s.bengaliName    : s.englishName;
        const secondaryName = currentLang === 'bn' ? s.englishName    : s.bengaliName;
        const ayahLabel     = currentLang === 'bn'
            ? `${s.numberOfAyahs} আয়াত`
            : `${s.numberOfAyahs} ayahs`;

        return `
            <a class="surah-card" href="surah.html?id=${s.number}" aria-label="সূরা ${s.number}: ${s.englishName}">
                <div class="surah-number">${s.number}</div>
                <div class="surah-info">
                    <div class="surah-arabic-name">${s.name}</div>
                    <div class="surah-names">
                        <span class="surah-bn-name">${primaryName}</span>
                        <span class="surah-en-name">${secondaryName}</span>
                    </div>
                    <div class="surah-meta">
                        <span class="ayah-count">${ayahLabel}</span>
                        <span class="tag ${tagClass}">${tagLabel}</span>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    surahGrid.classList.remove('hidden');
}

// -------------------------------------------------------
// Search / filter
// -------------------------------------------------------
function onSearchInput() {
    const query = searchInput.value.trim();

    // Show / hide clear button
    searchClear.classList.toggle('hidden', query === '');

    // Debounce: wait 200ms after user stops typing before filtering
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => filterSurahs(query), 200);
}

function filterSurahs(query) {
    if (!query) {
        filteredSurahs = allSurahs;
        searchCount.classList.add('hidden');
        renderCards(filteredSurahs);
        return;
    }

    const q = query.toLowerCase();
    // Search by number, English name, English translation, Bengali name, Arabic name
    filteredSurahs = allSurahs.filter(s =>
        String(s.number).includes(q) ||
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        s.bengaliName.includes(query) ||   // Bengali — case doesn't apply
        s.name.includes(query)             // Arabic
    );

    // Show result count
    const countLabel = currentLang === 'bn'
        ? `${filteredSurahs.length}টি সূরা পাওয়া গেছে`
        : `${filteredSurahs.length} surah(s) found`;
    searchCount.textContent = countLabel;
    searchCount.classList.remove('hidden');

    renderCards(filteredSurahs);
}

function clearSearch() {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    searchCount.classList.add('hidden');
    filteredSurahs = allSurahs;
    renderCards(filteredSurahs);
    searchInput.focus();
}

// -------------------------------------------------------
// Error display
// -------------------------------------------------------
function showError(message) {
    errorMsg.textContent = message || 'ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।';
    errorState.classList.remove('hidden');
    surahGrid.classList.add('hidden');
}
