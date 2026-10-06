async function testUrls() {
  const urls = [
    'https://quranpedia.net/ayah/2/256',
    'https://quranpedia.net/ayah/16/125',
    'https://quranpedia.net/ayah/60/8',
    'https://quranpedia.net/ayah/22/39',
    'https://quranpedia.net/surah/109',
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 MishkatTest/1.0' } });
      console.log(u, res.status);
      if (res.ok) {
        const text = await res.text();
        const m = text.match(/<title>(.*?)<\/title>/i);
        console.log('  Title:', m ? m[1].trim() : 'no title');
        console.log('  Includes إكراه:', text.includes('إكراه'));
        console.log('  Includes حكمة:', text.includes('حكمة'));
      }
    } catch (e: any) {
      console.log(u, 'ERR:', e.message);
    }
  }
}
testUrls();
