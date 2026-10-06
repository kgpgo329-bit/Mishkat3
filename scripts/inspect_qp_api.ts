async function test() {
  const res = await fetch('https://quranpedia.net/tafsirs', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  console.log('Status:', res.status);
  const text = await res.text();
  const links = [...text.matchAll(/href="([^"]*(?:tafsir|surah|ayah)[^"]*)"/gi)];
  console.log('Tafsir links:', [...new Set(links.map((m) => m[1]))].slice(0, 15));
}

test().catch(console.error);
