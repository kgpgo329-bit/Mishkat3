async function findJihadEverywhere() {
  // Let's test a few ranges: 1-100, 400-550, 1100-1300
  const ranges = [
    [450, 500], [520, 570], [1150, 1200]
  ];
  for (const [s, e] of ranges) {
    for (let id = s; id <= e; id += 2) {
      try {
        const res = await fetch(`https://islamic-content.com/t/${id}`);
        if (res.ok) {
          const text = await res.text();
          const m = text.match(/<title>(.*?)<\/title>/i);
          const title = m ? m[1].replace(/ - الجمهرة.*/, '').trim() : '';
          if (title.includes('جهاد') || title.includes('قتال') || title.includes('سيف') || title.includes('إكراه') || title.includes('حرية')) {
            console.log(`[FOUND ${id}] ${title}`);
          }
        }
      } catch {}
    }
  }
}

findJihadEverywhere();
