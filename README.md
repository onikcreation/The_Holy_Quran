# পবিত্র কুরআন — অনলাইন কুরআন রিডার

বাংলা ও ইংরেজি অনুবাদ এবং অডিও তিলাওয়াত সহ একটি সম্পূর্ণ অনলাইন কুরআন রিডার ওয়েবঅ্যাপ।
GitHub Pages-এ হোস্ট করার জন্য তৈরি — কোনো build step বা server লাগে না।

**Live Demo:** _[আপনার GitHub Pages লিংক এখানে দিন, যেমন: https://username.github.io/quran-app]_

---

## বৈশিষ্ট্যসমূহ

- **১১৪টি সূরার তালিকা** — আরবি নাম, বাংলা নাম, ইংরেজি নাম, আয়াত সংখ্যা, মক্কী/মাদানী ট্যাগ
- **রিয়েল-টাইম সার্চ** — সূরার নাম (বাংলা/ইংরেজি/আরবি) বা নম্বর দিয়ে ফিল্টার
- **আরবি টেক্সট** — Amiri ফন্টে সুন্দরভাবে প্রদর্শিত, ডান থেকে বামে
- **বাংলা অনুবাদ** — মুহিউদ্দীন খান (Muhiuddin Khan)
- **ইংরেজি অনুবাদ** — সাহীহ ইন্টারন্যাশনাল (Saheeh International) — টগল করে দেখানো/লুকানো যায়
- **অডিও তিলাওয়াত** — প্রতিটি আয়াতে ▶ বাটন দিয়ে শাইখ মিশারি আল-আফাসির তিলাওয়াত শুনুন
- **ডার্ক মোড** — সিস্টেম প্রেফারেন্স অনুযায়ী, ম্যানুয়াল টগলও আছে
- **বাংলা/ইংরেজি UI** — ইন্টারফেস ভাষা পরিবর্তনযোগ্য
- **Arabic ফন্ট সাইজ** — ছোট/মাঝারি/বড় — আপনার পছন্দমতো
- **Bookmark** — শেষ পড়া আয়াত স্বয়ংক্রিয়ভাবে সেভ হয়, ফিরে এলে সেখান থেকে শুরু করা যায়
- **Offline Support** — একবার লোড হওয়া ডেটা localStorage-এ ৭ দিন cache থাকে
- **Mobile-first Responsive** — মোবাইল, ট্যাবলেট ও ডেস্কটপে সমান সুন্দর

---

## প্রজেক্ট স্ট্রাকচার

```
quran-app/
├── index.html          ← সূরা তালিকা পেইজ
├── surah.html          ← সূরা বিস্তারিত পেইজ (surah.html?id=1 ... 114)
├── css/
│   └── style.css       ← সম্পূর্ণ স্টাইলশিট (CSS variables দিয়ে theming)
├── js/
│   ├── api.js          ← AlQuran Cloud API wrapper + localStorage cache
│   ├── surah-list.js   ← index.html এর সব logic
│   └── surah-detail.js ← surah.html এর সব logic
├── README.md
└── .gitignore
```

---

## ব্যবহৃত API

| API | Endpoint | বিবরণ |
|-----|----------|--------|
| [AlQuran Cloud](https://alquran.cloud) | `/v1/surah` | সব সূরার তালিকা |
| AlQuran Cloud | `/v1/surah/{id}` | আরবি টেক্সট |
| AlQuran Cloud | `/v1/surah/{id}/bn.bengali` | বাংলা অনুবাদ |
| AlQuran Cloud | `/v1/surah/{id}/en.sahih` | ইংরেজি অনুবাদ |
| [Islamic Network CDN](https://cdn.islamic.network) | `/quran/audio/128/ar.alafasy/{n}.mp3` | অডিও তিলাওয়াত |

সব API সম্পূর্ণ বিনামূল্যে — কোনো API key লাগে না।

---

## কীভাবে লোকালি রান করবেন

কোনো build step বা server লাগে না। শুধু:

```
index.html ফাইলটি যেকোনো modern browser-এ খুলুন
```

> **নোট:** Browser-এ সরাসরি `file://` দিয়ে খুললে কাজ করবে, কিন্তু অডিও CDN
> থেকে আসে বলে ইন্টারনেট সংযোগ দরকার। প্রথম লোডে API call হয়, পরে
> localStorage cache থেকে দেখায়।

**Live Server (optional)** — VS Code-এর Live Server extension ব্যবহার করলে
auto-reload সুবিধা পাবেন।

---

## GitHub Pages-এ Deploy করবেন যেভাবে

1. এই ফোল্ডারটি একটি GitHub repository-তে push করুন
2. Repository Settings → Pages → Source: `main` branch, `/ (root)` folder
3. Save করুন — কয়েক মিনিট পরে লাইভ হবে

---

## Tech Stack

- **HTML5** — Semantic markup, accessibility attributes
- **CSS3** — Custom properties (variables), CSS Grid, Flexbox, animations
- **Vanilla JavaScript (ES2020)** — Async/await, Promise.allSettled, IntersectionObserver
- **Web APIs** — localStorage, HTML5 Audio, URLSearchParams
- **Fonts** — Google Fonts (Amiri, Inter, Noto Sans Bengali)

কোনো framework, library বা build tool ব্যবহার করা হয়নি।

---

## Changelog

### v1.0 — 2026-06-21
- প্রাথমিক রিলিজ
- ১১৪টি সূরার তালিকা (সার্চ সহ)
- আরবি + বাংলা + ইংরেজি অনুবাদ
- প্রতি আয়াতে অডিও তিলাওয়াত
- ডার্ক মোড + বাংলা/ইংরেজি UI টগল
- Arabic ফন্ট সাইজ কন্ট্রোল
- Bookmark (শেষ পড়া আয়াত সেভ)
- localStorage cache (৭ দিন)
- Mobile-first responsive design

---

## Credit

- **কুরআনের ডেটা:** [AlQuran Cloud](https://alquran.cloud) — Meezaan Technologies
- **বাংলা অনুবাদ:** মুহিউদ্দীন খান
- **ইংরেজি অনুবাদ:** Saheeh International
- **অডিও তিলাওয়াত:** শাইখ মিশারি রাশিদ আল-আফাসি
- **Arabic Font:** [Amiri](https://www.amirifont.org/) — Khaled Hosny (SIL Open Font License)
