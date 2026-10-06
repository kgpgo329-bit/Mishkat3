import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';

async function showSurah60() {
  const s60 = await (await fetch('https://quranpedia.net/surah/60')).text();
  const clean60 = cleanHtmlText(s60);
  const idx = clean60.indexOf('تقسطوا');
  console.log('Surah 60 snippet around تقسطوا:');
  console.log(clean60.substring(Math.max(0, idx - 100), idx + 300));
}

showSurah60();
