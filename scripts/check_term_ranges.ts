async function checkTermRanges() {
  const sampleIds = [
    1, 10, 50, 100, 200, 500, 1000, 1500, 1700, 1800, 1850, 1900, 1950, 2000, 2100, 2200, 2500
  ];
  for (const id of sampleIds) {
    try {
      const res = await fetch(`https://islamic-content.com/t/${id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 MishkatTest/1.0' },
      });
      if (res.ok) {
        const text = await res.text();
        const m = text.match(/<title>(.*?)<\/title>/i);
        console.log(`Term ${id}:`, m ? m[1].replace(/ - الجمهرة.*/, '').trim() : 'ok');
      } else {
        console.log(`Term ${id}: status ${res.status}`);
      }
    } catch (e: any) {
      console.log(`Term ${id} ERR:`, e.message);
    }
  }
}

checkTermRanges();
