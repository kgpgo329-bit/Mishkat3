import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';

async function check813() {
  const res = await fetch('https://islamic-content.com/t/813');
  const text = await res.text();
  const cleaned = cleanHtmlText(text);
  const idx = cleaned.indexOf('غزوة الحديبية');
  console.log('Term 813 cleaned length:', cleaned.length);
  console.log(cleaned.substring(idx >= 0 ? idx : 0, (idx >= 0 ? idx : 0) + 700));
}

check813();
