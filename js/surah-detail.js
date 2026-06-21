// ============================================================
// surah-detail.js — v1.0
// Controls the Surah Detail page (surah.html)
// Handles: URL param reading, parallel data fetch, ayah
//          rendering, audio playback, English toggle,
//          font-size adjuster, bookmarks, prev/next nav
// ============================================================

'use strict';

// -------------------------------------------------------
// State
// -------------------------------------------------------
let currentSurahId = 1;
let surahData = null;          // { arabic, bengali, english }
let currentLang = 'bn';        // UI language from localStorage
let showEnglish = false;       // Whether English translations are visible
let arabicFontSize = 'md';     // 'sm' | 'md' | 'lg'

// Audio state
let audioElement = null;       // the single <audio> element on the page
let playingAyahId = null;      // global ayah number currently playing
let playingBtn = null;         // the play button DOM node currently active

// -------------------------------------------------------
// Init
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Parse surah ID from URL: surah.html?id=2
    const params = new URLSearchParams(window.location.search);
    currentSurahId = parseInt(params.get('id'), 10);
    if (!currentSurahId || currentSurahId < 1 || currentSurahId > 114) {
        currentSurahId = 1; // graceful fallback
    }

    // Restore preferences
    currentLang    = localStorage.getItem('quran_lang')       || 'bn';
    arabicFontSize = localStorage.getItem('quran_font_size')  || 'md';
    showEnglish    = localStorage.getItem('quran_show_en') === 'true';

    // Grab audio element
    audioElement = document.getElementById('quran-audio');
    audioElement.addEventListener('ended',  onAudioEnded);
    audioElement.addEventListener('error',  onAudioError);

    // Apply theme (same logic as list page)
    initTheme();
    applyLanguage();
    applyFontSize();
    updateEnglishToggleBtn();

    // Wire controls
    document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('prev-surah').addEventListener('click', () => navigate(-1));
    document.getElementById('next-surah').addEventListener('click', () => navigate(1));
    document.getElementById('font-decrease').addEventListener('click', () => changeFontSize(-1));
    document.getElementById('font-increase').addEventListener('click', () => changeFontSize(1));
    document.getElementById('btn-english-toggle').addEventListener('click', toggleEnglish);

    // Load surah data
    loadSurah();
});

// -------------------------------------------------------
// Theme
// -------------------------------------------------------
function initTheme() {
    const saved = localStorage.getItem('quran_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved || (prefersDark ? 'dark' : 'light'));
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('quran_theme', next);
}

// -------------------------------------------------------
// Language
// -------------------------------------------------------
function applyLanguage() {
    const btn = document.getElementById('lang-toggle');
    if (btn) {
        btn.textContent = currentLang === 'bn' ? 'EN' : 'বাং';
    }
    // Swap all data-bn / data-en text nodes
    document.querySelectorAll('[data-bn]').forEach(el => {
        el.textContent = currentLang === 'bn'
            ? el.getAttribute('data-bn')
            : el.getAttribute('data-en');
    });
}

function toggleLanguage() {
    currentLang = currentLang === 'bn' ? 'en' : 'bn';
    localStorage.setItem('quran_lang', currentLang);
    applyLanguage();
    // Re-render if data is loaded (surah name in header changes)
    if (surahData) updateHeaderInfo();
}

// -------------------------------------------------------
// Font size (Arabic text)
// -------------------------------------------------------
const FONT_SIZES = ['sm', 'md', 'lg'];

function applyFontSize() {
    const ayahList = document.getElementById('ayah-list');
    if (!ayahList) return;
    ayahList.classList.remove('arabic-font-sm', 'arabic-font-md', 'arabic-font-lg');
    if (arabicFontSize !== 'md') {
        ayahList.classList.add(`arabic-font-${arabicFontSize}`);
    }
    // Update button states
    document.getElementById('font-decrease').disabled = arabicFontSize === 'sm';
    document.getElementById('font-increase').disabled = arabicFontSize === 'lg';
}

function changeFontSize(direction) {
    const idx = FONT_SIZES.indexOf(arabicFontSize);
    const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + direction))];
    if (next === arabicFontSize) return;
    arabicFontSize = next;
    localStorage.setItem('quran_font_size', arabicFontSize);
    applyFontSize();
}

// -------------------------------------------------------
// English translation toggle
// -------------------------------------------------------
function toggleEnglish() {
    showEnglish = !showEnglish;
    localStorage.setItem('quran_show_en', showEnglish);
    updateEnglishToggleBtn();

    const ayahList = document.getElementById('ayah-list');
    if (ayahList) {
        ayahList.classList.toggle('english-hidden', !showEnglish);
    }
}

function updateEnglishToggleBtn() {
    const btn = document.getElementById('btn-english-toggle');
    if (!btn) return;
    btn.classList.toggle('active', showEnglish);
    btn.textContent = showEnglish
        ? (currentLang === 'bn' ? 'EN লুকান' : 'Hide EN')
        : (currentLang === 'bn' ? 'EN দেখুন' : 'Show EN');
}

// -------------------------------------------------------
// Navigation (Prev / Next surah)
// -------------------------------------------------------
function navigate(direction) {
    const next = currentSurahId + direction;
    if (next < 1 || next > 114) return;
    window.location.href = `surah.html?id=${next}`;
}

function updateNavButtons() {
    document.getElementById('prev-surah').disabled = currentSurahId <= 1;
    document.getElementById('next-surah').disabled = currentSurahId >= 114;
}

// -------------------------------------------------------
// Load surah data
// -------------------------------------------------------
async function loadSurah() {
    showLoadingState();
    updateNavButtons();

    try {
        // getSurahAllData is defined in api.js — fetches all 3 editions in parallel
        surahData = await getSurahAllData(currentSurahId);

        updateHeaderInfo();
        renderAyahs();
        checkBookmark();
    } catch (err) {
        showErrorState(err.message);
    }
}

// -------------------------------------------------------
// Update header title / meta after data loads
// -------------------------------------------------------
function updateHeaderInfo() {
    const s = surahData.arabic;

    // getBengaliName() is defined in api.js (loaded first)
    const bengaliName = getBengaliName(s.number) || s.englishName;

    const displayName = currentLang === 'bn' ? bengaliName : s.englishName;
    const revType     = s.revelationType;
    const revLabel    = currentLang === 'bn'
        ? (revType === 'Meccan' ? 'মক্কী' : 'মাদানী')
        : revType;
    const ayahLabel   = currentLang === 'bn'
        ? `${s.numberOfAyahs} আয়াত`
        : `${s.numberOfAyahs} ayahs`;

    // Update <head> title for the browser tab
    document.title = `সূরা ${s.number}: ${displayName} | পবিত্র কুরআন`;

    // Header title elements
    const nameEl = document.getElementById('page-surah-name');
    const metaEl = document.getElementById('page-surah-meta');
    if (nameEl) nameEl.textContent = `${s.number}. ${displayName}`;
    if (metaEl) metaEl.textContent = `${ayahLabel} · ${revLabel}`;

    // Surah info card at top of content
    const infoCard = document.getElementById('surah-info-card');
    if (infoCard) {
        infoCard.innerHTML = `
            <div class="surah-info-arabic">${s.name}</div>
            <div class="surah-info-names">${displayName} · ${s.englishNameTranslation}</div>
            <div class="surah-info-meta">
                <span>${s.number}/${114}</span>
                <span class="dot">·</span>
                <span>${ayahLabel}</span>
                <span class="dot">·</span>
                <span>${revLabel}</span>
            </div>
        `;
    }
}

// -------------------------------------------------------
// Render all ayah cards
// -------------------------------------------------------
function renderAyahs() {
    const ayahList = document.getElementById('ayah-list');
    const arabicAyahs  = surahData.arabic.ayahs;
    const bengaliAyahs = surahData.bengali ? surahData.bengali.ayahs : [];
    const englishAyahs = surahData.english ? surahData.english.ayahs : [];

    // Bismillah header: show for surahs 2–114 except surah 9 (At-Tawbah has no Bismillah)
    const showBismillah = currentSurahId !== 1 && currentSurahId !== 9;
    let html = '';

    if (showBismillah) {
        html += `
            <div class="bismillah-header">
                <div class="bismillah-text">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            </div>
        `;
    }

    // Build each ayah card
    arabicAyahs.forEach((ayah, i) => {
        const bnText = bengaliAyahs[i] ? bengaliAyahs[i].text : '';
        const enText = englishAyahs[i] ? englishAyahs[i].text : '';

        const bnBlock = bnText ? `
            <div class="translation-block">
                <div class="translation-label">${currentLang === 'bn' ? 'বাংলা' : 'Bengali'}</div>
                <div class="bengali-translation">${escapeHtml(bnText)}</div>
            </div>
        ` : '';

        // English block — gets hidden/shown by the .english-hidden class on the list container
        const enBlock = enText ? `
            <div class="translation-block english-block">
                <div class="translation-label">English</div>
                <div class="english-translation">${escapeHtml(enText)}</div>
            </div>
        ` : '';

        html += `
            <div class="ayah-card" id="ayah-${ayah.numberInSurah}" data-ayah="${ayah.numberInSurah}">
                <div class="ayah-header">
                    <div class="ayah-badge" title="আয়াত ${ayah.numberInSurah}">${ayah.numberInSurah}</div>
                    <button
                        class="play-btn"
                        data-global="${ayah.number}"
                        data-local="${ayah.numberInSurah}"
                        title="তিলাওয়াত শুনুন (আয়াত ${ayah.numberInSurah})"
                        aria-label="Play ayah ${ayah.numberInSurah}"
                    >
                        ${playIcon()}
                    </button>
                </div>
                <div class="arabic-text">${ayah.text}</div>
                ${bnBlock}
                ${enBlock}
            </div>
        `;
    });

    ayahList.innerHTML = html;

    // Apply current font size & English visibility
    applyFontSize();
    ayahList.classList.toggle('english-hidden', !showEnglish);

    // Attach click handlers to all play buttons
    ayahList.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', onPlayClick);
    });

    // Show the ayah list, hide loading
    document.getElementById('loading-state').classList.add('hidden');
    ayahList.classList.remove('hidden');

    // Set up Intersection Observer to auto-save bookmark as user reads
    setupBookmarkObserver();
}

// -------------------------------------------------------
// Audio playback
// -------------------------------------------------------
function onPlayClick(e) {
    const btn = e.currentTarget;
    const globalNum = parseInt(btn.dataset.global, 10);
    const localNum  = parseInt(btn.dataset.local, 10);
    const surahNum  = currentSurahId;

    // If same ayah is playing → pause it
    if (playingAyahId === globalNum && !audioElement.paused) {
        audioElement.pause();
        setPlayingState(null, null);
        return;
    }

    // Stop any currently playing audio
    if (!audioElement.paused) {
        audioElement.pause();
    }
    if (playingBtn) {
        resetBtn(playingBtn);
    }
    if (playingAyahId) {
        document.getElementById(`ayah-${getLocalFromGlobal(playingAyahId)}`)
            ?.classList.remove('playing');
    }

    // Start new audio
    const audioUrl = buildAudioUrl(globalNum); // defined in api.js
    audioElement.src = audioUrl;

    // Show loading state on the button while audio buffers
    btn.classList.add('loading');
    btn.innerHTML = '';

    audioElement.play()
        .then(() => {
            btn.classList.remove('loading');
            btn.innerHTML = pauseIcon();
            btn.classList.add('playing');
            setPlayingState(globalNum, btn);
            document.getElementById(`ayah-${localNum}`)?.classList.add('playing');
        })
        .catch(err => {
            btn.classList.remove('loading');
            btn.innerHTML = playIcon();
            setPlayingState(null, null);
            showToast(currentLang === 'bn'
                ? 'অডিও চালানো যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।'
                : 'Could not play audio. Check your connection.');
            console.error('Audio play failed:', err);
        });
}

// Helper: store currently playing ayah global number and button
function setPlayingState(globalNum, btn) {
    playingAyahId = globalNum;
    playingBtn = btn;
}

// We need local ayah number from global — find in rendered data
function getLocalFromGlobal(globalNum) {
    if (!surahData) return null;
    const found = surahData.arabic.ayahs.find(a => a.number === globalNum);
    return found ? found.numberInSurah : null;
}

function onAudioEnded() {
    if (playingBtn) {
        resetBtn(playingBtn);
    }
    const localNum = getLocalFromGlobal(playingAyahId);
    if (localNum) {
        document.getElementById(`ayah-${localNum}`)?.classList.remove('playing');
    }
    setPlayingState(null, null);
}

function onAudioError() {
    onAudioEnded();
    showToast(currentLang === 'bn'
        ? 'অডিও লোড হয়নি।'
        : 'Audio failed to load.');
}

function resetBtn(btn) {
    btn.classList.remove('playing', 'loading');
    btn.innerHTML = playIcon();
}

// SVG icons for play / pause
function playIcon() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21"/>
    </svg>`;
}
function pauseIcon() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
    </svg>`;
}

// -------------------------------------------------------
// Bookmark: save last-read ayah using IntersectionObserver
// -------------------------------------------------------
function setupBookmarkObserver() {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const ayahNum = parseInt(entry.target.dataset.ayah, 10);
                saveBookmark(currentSurahId, ayahNum); // from api.js
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.ayah-card').forEach(card => observer.observe(card));
}

function checkBookmark() {
    const saved = loadBookmark(currentSurahId); // from api.js
    if (!saved || saved <= 1) return;

    const banner    = document.getElementById('bookmark-banner');
    const textEl    = document.getElementById('bookmark-text');
    const continueBtn = document.getElementById('bookmark-continue');
    const dismissBtn  = document.getElementById('bookmark-dismiss');

    const msg = currentLang === 'bn'
        ? `আপনি আয়াত ${saved} পর্যন্ত পড়েছিলেন`
        : `You read up to ayah ${saved}`;
    textEl.textContent = msg;

    banner.classList.remove('hidden');

    continueBtn.textContent = currentLang === 'bn' ? 'সেখান থেকে যান' : 'Jump there';
    continueBtn.onclick = () => {
        banner.classList.add('hidden');
        const target = document.getElementById(`ayah-${saved}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    dismissBtn.onclick = () => {
        banner.classList.add('hidden');
        clearBookmark(currentSurahId); // from api.js
    };
}

// -------------------------------------------------------
// Loading / Error state helpers
// -------------------------------------------------------
function showLoadingState() {
    const loading = document.getElementById('loading-state');
    const ayahList = document.getElementById('ayah-list');
    const errorDiv = document.getElementById('error-state');

    // Generate skeleton ayah cards
    loading.innerHTML = Array.from({ length: 5 }, (_, i) => `
        <div class="skeleton-ayah">
            <div class="ayah-header">
                <div class="skeleton skeleton-circle" style="width:36px;height:36px"></div>
                <div class="skeleton skeleton-circle" style="width:36px;height:36px"></div>
            </div>
            <div class="skeleton skeleton-arabic ${i % 2 === 0 ? '' : 'skeleton-arabic-2'}"></div>
            <div class="skeleton skeleton-arabic-2"></div>
            <div style="height:0.5rem"></div>
            <div class="skeleton skeleton-line skeleton-line-w100" style="height:14px"></div>
            <div class="skeleton skeleton-line skeleton-line-w70"  style="height:14px"></div>
        </div>
    `).join('');

    loading.classList.remove('hidden');
    ayahList.classList.add('hidden');
    errorDiv.classList.add('hidden');
}

function showErrorState(message) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('ayah-list').classList.add('hidden');

    const errorDiv = document.getElementById('error-state');
    const msgEl    = document.getElementById('error-detail-msg');
    if (msgEl) msgEl.textContent = message || 'ইন্টারনেট সংযোগ পরীক্ষা করুন।';
    errorDiv.classList.remove('hidden');

    document.getElementById('retry-btn-detail')?.addEventListener('click', loadSurah, { once: true });
}

// -------------------------------------------------------
// Toast notification
// -------------------------------------------------------
function showToast(message, durationMs = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), durationMs);
}

// -------------------------------------------------------
// Utility: escape HTML to prevent XSS when rendering API text
// -------------------------------------------------------
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
