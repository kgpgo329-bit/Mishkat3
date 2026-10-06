async function checkTreaties() {
  for (let id = 815; id <= 845; id += 2) {
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

checkTreaties();
