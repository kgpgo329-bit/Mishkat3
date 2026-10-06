async function inspectRawQuranpedia() {
  const res = await fetch('https://quranpedia.net/surah/16');
  const html = await res.text();
  console.log('HTML length:', html.length);
  // Look for Arabic phrases in raw HTML
  console.log('Raw includes الحكمة:', html.includes('الحكمة'));
  console.log('Raw includes ادع:', html.includes('ادع') || html.includes('ادْعُ'));
  console.log('Raw includes أسباب النزول:', html.includes('أسباب النزول'));
  console.log('Raw includes مقاصد:', html.includes('مقاصد'));
  console.log('Raw includes مواضيع:', html.includes('مواضيع'));

  // What sections exist?
  const headers = [...html.matchAll(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi)];
  console.log('Headers:', headers.map(h => h[1].replace(/<[^>]+>/g, '').trim()).slice(0, 10));
}

inspectRawQuranpedia();
