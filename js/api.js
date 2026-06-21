// ============================================================
// api.js — v1.0
// AlQuran Cloud API wrapper with localStorage caching
// API: https://alquran.cloud/api  (free, no key needed)
// ============================================================

'use strict';

const API_BASE = 'https://api.alquran.cloud/v1';

// Cache prefix & TTL (7 days) — avoids hammering the API on every visit
const CACHE_PREFIX = 'quran_v1_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// -------------------------------------------------------
// Bengali surah names (static — not returned by the API)
// Index 0 = Surah 1 (Al-Fatiha), Index 113 = Surah 114 (An-Nas)
// -------------------------------------------------------
const BENGALI_SURAH_NAMES = [
    'আল-ফাতিহা', 'আল-বাকারা', 'আলি ইমরান', 'আন-নিসা', 'আল-মায়িদা',
    'আল-আনআম', 'আল-আরাফ', 'আল-আনফাল', 'আত-তাওবা', 'ইউনুস',
    'হুদ', 'ইউসুফ', 'আর-রাদ', 'ইবরাহীম', 'আল-হিজর',
    'আন-নাহল', 'আল-ইসরা', 'আল-কাহফ', 'মারইয়াম', 'ত্বহা',
    'আল-আম্বিয়া', 'আল-হাজ্জ', 'আল-মুমিনুন', 'আন-নূর', 'আল-ফুরকান',
    'আশ-শুআরা', 'আন-নামল', 'আল-কাসাস', 'আল-আনকাবুত', 'আর-রুম',
    'লুকমান', 'আস-সাজদা', 'আল-আহযাব', 'সাবা', 'ফাতির',
    'ইয়াসীন', 'আস-সাফফাত', 'সাদ', 'আয-যুমার', 'গাফির',
    'ফুসসিলাত', 'আশ-শুরা', 'আয-যুখরুফ', 'আদ-দুখান', 'আল-জাসিয়া',
    'আল-আহকাফ', 'মুহাম্মাদ', 'আল-ফাতহ', 'আল-হুজুরাত', 'ক্বাফ',
    'আয-যারিয়াত', 'আত-তূর', 'আন-নাজম', 'আল-কামার', 'আর-রাহমান',
    'আল-ওয়াকিআ', 'আল-হাদীদ', 'আল-মুজাদালা', 'আল-হাশর', 'আল-মুমতাহিনা',
    'আস-সাফ', 'আল-জুমুআ', 'আল-মুনাফিকুন', 'আত-তাগাবুন', 'আত-তালাক',
    'আত-তাহরীম', 'আল-মুলক', 'আল-কালাম', 'আল-হাক্কা', 'আল-মাআরিজ',
    'নূহ', 'আল-জিন্ন', 'আল-মুযযাম্মিল', 'আল-মুদ্দাস্সির', 'আল-কিয়ামা',
    'আল-ইনসান', 'আল-মুরসালাত', 'আন-নাবা', 'আন-নাযিআত', 'আবাসা',
    'আত-তাকবীর', 'আল-ইনফিতার', 'আল-মুতাফফিফীন', 'আল-ইনশিকাক', 'আল-বুরুজ',
    'আত-তারিক', 'আল-আলা', 'আল-গাশিয়া', 'আল-ফাজর', 'আল-বালাদ',
    'আশ-শামস', 'আল-লাইল', 'আদ-দুহা', 'আশ-শারহ', 'আত-তীন',
    'আল-আলাক', 'আল-কদর', 'আল-বাইয়িনা', 'আয-যালযালা', 'আল-আদিয়াত',
    'আল-কারিআ', 'আত-তাকাসুর', 'আল-আসর', 'আল-হুমাযা', 'আল-ফীল',
    'কুরাইশ', 'আল-মাউন', 'আল-কাওসার', 'আল-কাফিরুন', 'আন-নাসর',
    'আল-মাসাদ', 'আল-ইখলাস', 'আল-ফালাক', 'আন-নাস'
];

// -------------------------------------------------------
// localStorage helpers
// -------------------------------------------------------

function cacheSet(key, data) {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
            data,
            ts: Date.now()
        }));
    } catch {
        // Storage full — skip caching, app still works
    }
}

function cacheGet(key) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        // Return null if cache has expired
        return (Date.now() - ts < CACHE_TTL_MS) ? data : null;
    } catch {
        return null;
    }
}

// -------------------------------------------------------
// Core fetch: checks cache first, then calls the API
// -------------------------------------------------------

async function apiFetch(cacheKey, url) {
    // Return cached data if still fresh
    const hit = cacheGet(cacheKey);
    if (hit !== null) return hit;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`নেটওয়ার্ক এরর (HTTP ${res.status})`);

    const json = await res.json();
    if (json.code !== 200) throw new Error(json.status || 'API থেকে ডেটা পাওয়া যায়নি');

    cacheSet(cacheKey, json.data);
    return json.data;
}

// -------------------------------------------------------
// Public API functions
// -------------------------------------------------------

// Public accessor so surah-detail.js can get Bengali names
// (const declarations in one <script> aren't accessible in other scripts)
function getBengaliName(surahNumber) {
    return BENGALI_SURAH_NAMES[surahNumber - 1] || '';
}

// Returns all 114 surahs with bengaliName added
async function getAllSurahs() {
    const list = await apiFetch('surah_list', `${API_BASE}/surah`);
    return list.map(s => ({
        ...s,
        bengaliName: BENGALI_SURAH_NAMES[s.number - 1] || s.englishName
    }));
}

// Arabic text only
async function getSurahArabic(id) {
    return apiFetch(`ar_${id}`, `${API_BASE}/surah/${id}`);
}

// Bengali translation — Muhiuddin Khan edition
async function getSurahBengali(id) {
    return apiFetch(`bn_${id}`, `${API_BASE}/surah/${id}/bn.bengali`);
}

// English translation — Saheeh International edition
async function getSurahEnglish(id) {
    return apiFetch(`en_${id}`, `${API_BASE}/surah/${id}/en.sahih`);
}

// Fetch all three editions in parallel — Arabic failure is fatal,
// translation failures degrade gracefully (we still show the Arabic)
async function getSurahAllData(id) {
    const [arabic, bengali, english] = await Promise.allSettled([
        getSurahArabic(id),
        getSurahBengali(id),
        getSurahEnglish(id)
    ]);

    if (arabic.status === 'rejected') {
        throw new Error('সূরা লোড করা যায়নি: ' + arabic.reason.message);
    }

    return {
        arabic: arabic.value,
        bengali: bengali.status === 'fulfilled' ? bengali.value : null,
        english: english.status === 'fulfilled' ? english.value : null
    };
}

// Build audio URL directly from the global ayah number (1–6236).
// This avoids making a separate API call for every single ayah.
// CDN pattern: https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{globalNum}.mp3
function buildAudioUrl(globalAyahNumber) {
    return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber}.mp3`;
}

// -------------------------------------------------------
// Bookmark helpers — saves last-read ayah per surah
// -------------------------------------------------------

function saveBookmark(surahId, ayahNumberInSurah) {
    try {
        localStorage.setItem(`quran_bm_${surahId}`, String(ayahNumberInSurah));
    } catch { /* ignore */ }
}

function loadBookmark(surahId) {
    const v = localStorage.getItem(`quran_bm_${surahId}`);
    return v ? parseInt(v, 10) : null;
}

function clearBookmark(surahId) {
    localStorage.removeItem(`quran_bm_${surahId}`);
}
