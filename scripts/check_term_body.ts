import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';

async function checkTermBody(id: number) {
  const res = await fetch(`https://islamic-content.com/t/${id}`);
  const html = await res.text();
  const cleaned = cleanHtmlText(html);

  // Find where the title occurs in cleaned text
  const m = html.match(/<title>(.*?)<\/title>/i);
  const title = m ? m[1].replace(/ - الجمهرة.*/, '').trim() : '';

  const idx = cleaned.indexOf(title);
  const mainText = idx >= 0 ? cleaned.substring(idx) : cleaned;

  console.log(`\n========================================`);
  console.log(`[Term ${id}] "${title}"`);
  console.log(mainText.substring(0, 500));
}

async function main() {
  await checkTermBody(692); // غير المسلمين
  await checkTermBody(699); // الحكمة في الدعوة
  await checkTermBody(700); // الموعظة الحسنة
  await checkTermBody(701); // المجادلة بالتي هي أحسن
  await checkTermBody(764); // الغزوات والسرايا والبعوث
  await checkTermBody(2200); // رحمة النبي صلى الله عليه وسلم وشفقته
  await checkTermBody(833); // غزوة فتح مكة
}

main();
