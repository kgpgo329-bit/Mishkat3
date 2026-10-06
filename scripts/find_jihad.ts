async function findJihadTerms() {
  const checkBatches = [
    [550, 560], [580, 590], [610, 620], [640, 650], [660, 670],
    [750, 760], [770, 780], [810, 820], [840, 850],
    [1100, 1110], [1200, 1210], [1300, 1310], [1400, 1410]
  ];
  for (const [start, end] of checkBatches) {
    for (let id = start; id <= end; id += 2) {
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
}

findJihadTerms();
