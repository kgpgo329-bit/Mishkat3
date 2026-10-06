import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';

async function inspectTerms() {
  const ids = [692, 699, 700, 701, 703, 750, 764, 2200];
  for (const id of ids) {
    const res = await fetch(`https://islamic-content.com/t/${id}`);
    if (res.ok) {
      const text = await res.text();
      const m = text.match(/<title>(.*?)<\/title>/i);
      const title = m ? m[1].replace(/ - الجمهرة.*/, '').trim() : '';
      const cleaned = cleanHtmlText(text);
      console.log(`\n========================================`);
      console.log(`Term ${id}: "${title}" (length: ${cleaned.length})`);
      console.log(`Snippet: ${cleaned.substring(0, 300).replace(/\n/g, ' ')}...`);
    }
  }
}

inspectTerms();
