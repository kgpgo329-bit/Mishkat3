import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';

async function scanDawa() {
  console.log('Scanning dawa.center files 10300 to 10339 for relevant titles:');
  for (let id = 10300; id <= 10339; id += 2) {
    try {
      const res = await fetch(`https://dawa.center/file/${id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MishkatScan/1.0' },
      });
      if (res.ok) {
        const text = await res.text();
        const m = text.match(/<title>(.*?)<\/title>/i);
        const title = m ? m[1].replace(/ - المستودع الدعوي الرقمي.*/, '').trim() : '';
        if (
          title.includes('إسلام') ||
          title.includes('جهاد') ||
          title.includes('سيف') ||
          title.includes('شبه') ||
          title.includes('حري') ||
          title.includes('حكم') ||
          title.includes('سلام') ||
          title.includes('فتح') ||
          title.includes('دعوة') ||
          title.includes('تاريخ')
        ) {
          console.log(`[Dawa ${id}] ${title}`);
        }
      }
    } catch {}
  }
}

scanDawa();
