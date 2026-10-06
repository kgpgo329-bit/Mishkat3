import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';

async function checkDawa10344() {
  const res = await fetch('https://dawa.center/file/10344');
  const text = await res.text();
  const cleaned = cleanHtmlText(text);
  console.log('Dawa 10344 length:', cleaned.length);
  console.log(cleaned.substring(0, 600));
}

checkDawa10344();
