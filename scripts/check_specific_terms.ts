async function checkSpecificTerms() {
  const ids = [
    2200, 2201, 2202, 2203, 2204, 2205, 2210, 2215, 2220,
    995, 996, 997, 998, 999, 1000, 1001, 1002, 1005,
    500, 501, 502, 505, 510,
    600, 700, 800, 900
  ];
  for (const id of ids) {
    try {
      const res = await fetch(`https://islamic-content.com/t/${id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 MishkatTest/1.0' },
      });
      if (res.ok) {
        const text = await res.text();
        const m = text.match(/<title>(.*?)<\/title>/i);
        const title = m ? m[1].replace(/ - الجمهرة.*/, '').trim() : '';
        console.log(`[Term ${id}] ${title}`);
      }
    } catch {}
  }
}

checkSpecificTerms();
