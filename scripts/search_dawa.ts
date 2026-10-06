async function searchDawa() {
  const queries = ['الكعبة', 'القبلة', 'اختلاف العلماء', 'أسباب الاختلاف', 'سورة الإخلاص', 'تفسير سورة الإخلاص'];
  for (const q of queries) {
    const url = `https://dawa.center/search?q=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 MishkatTest/1.0' } });
      console.log(`Dawa search "${q}": status ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        const matches = [...text.matchAll(/href="\/file\/(\d+)"[^>]*>(.*?)<\/a>/g)];
        console.log(`  Found ${matches.length} files:`);
        for (const m of matches.slice(0, 5)) {
          console.log(`    File ${m[1]}: ${m[2].replace(/<[^>]+>/g, '').trim()}`);
        }
      }
    } catch (e: any) {
      console.log(`ERR for "${q}":`, e.message);
    }
  }
}
searchDawa();
