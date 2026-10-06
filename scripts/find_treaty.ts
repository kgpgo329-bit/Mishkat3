async function findTreatyTerms() {
  for (let id = 790; id <= 815; id++) {
    try {
      const res = await fetch(`https://islamic-content.com/t/${id}`);
      if (res.ok) {
        const text = await res.text();
        const m = text.match(/<title>(.*?)<\/title>/i);
        const title = m ? m[1].replace(/ - الجمهرة.*/, '').trim() : '';
        if (title.includes('الحديبية') || title.includes('صلح') || title.includes('جهاد') || title.includes('قتال') || title.includes('عهد') || title.includes('ذمة')) {
          console.log(`[FOUND ${id}] ${title}`);
        }
      }
    } catch {}
  }
}

findTreatyTerms();
