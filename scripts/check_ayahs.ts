import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';

async function checkAyahs() {
  const s16 = await (await fetch('https://quranpedia.net/surah/16')).text();
  const clean16 = cleanHtmlText(s16);
  console.log('Surah 16 contains ادع إلى سبيل ربك:', clean16.includes('ادع') && clean16.includes('الحكمة'));

  const s22 = await (await fetch('https://quranpedia.net/surah/22')).text();
  const clean22 = cleanHtmlText(s22);
  console.log('Surah 22 contains أذن للذين / يقاتلون:', clean22.includes('يقاتلون') || clean22.includes('ظلموا'));

  const s60 = await (await fetch('https://quranpedia.net/surah/60')).text();
  const clean60 = cleanHtmlText(s60);
  console.log('Surah 60 contains لا ينهاكم الله / تقسطوا:', clean60.includes('ينهاكم') || clean60.includes('تقسطوا'));
}

checkAyahs();
