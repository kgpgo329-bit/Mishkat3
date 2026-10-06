async function testIcSearch() {
  const terms = ['الكعبة', 'القبلة', 'الاجتهاد', 'الإخلاص'];
  for (const t of terms) {
    const res = await fetch(`https://islamic-content.com/search?q=${encodeURIComponent(t)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 MishkatTest/1.0' },
    });
    console.log(`Search "${t}" status:`, res.status);
    if (res.ok) {
      const text = await res.text();
      const allLinks = [...text.matchAll(/href="(\/t\/\d+)"[^>]*>(.*?)<\/a>/g)];
      console.log(`  Found ${allLinks.length} terms for "${t}":`);
      for (const tl of allLinks.slice(0, 5)) {
        console.log(`    Link: ${tl[1]} -> ${tl[2].replace(/<[^>]+>/g, '').trim()}`);
      }
    }
  }
}

testIcSearch();
