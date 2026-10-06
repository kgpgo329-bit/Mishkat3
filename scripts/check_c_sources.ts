import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';

async function checkUrl(url: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MishkatTest/1.0' } });
    console.log(url, 'Status:', res.status);
    if (res.ok) {
      const text = await res.text();
      const cleaned = cleanHtmlText(text);
      console.log('  Cleaned length:', cleaned.length);
      console.log('  Snippet:', cleaned.substring(0, 150).replace(/\n/g, ' '));
      return { url, ok: true, cleaned };
    }
  } catch (e: any) {
    console.log(url, 'ERR:', e.message);
  }
  return { url, ok: false, cleaned: '' };
}

async function main() {
  console.log('Testing Quranpedia Surahs on Jihad, Qital, and Da\'wah:');
  await checkUrl('https://quranpedia.net/surah/16'); // An-Nahl (ادع إلى سبيل ربك بالحكمة)
  await checkUrl('https://quranpedia.net/surah/22'); // Al-Hajj (أذن للذين يقاتلون بأنهم ظلموا)
  await checkUrl('https://quranpedia.net/surah/60'); // Al-Mumtahanah (لا ينهاكم الله عن الذين لم يقاتلوكم)
  await checkUrl('https://quranpedia.net/surah/48'); // Al-Fath (فتح مكة وصلح الحديبية)
  await checkUrl('https://quranpedia.net/surah/9');  // At-Tawbah

  console.log('\nTesting Dawa Center files:');
  for (let id = 10340; id <= 10344; id++) {
    await checkUrl(`https://dawa.center/file/${id}`);
  }

  console.log('\nTesting Islamic Content terms for Jihad / Qital / Hurriyya:');
  for (let term = 1880; term <= 1890; term++) {
    await checkUrl(`https://islamic-content.com/t/${term}`);
  }
}

main();
