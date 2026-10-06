async function searchIC() {
  const res = await fetch('https://islamic-content.com/search?q=%D8%A7%D9%84%D8%AC%D9%87%D8%A7%D8%AF');
  const html = await res.text();
  // Find all links
  const links = [...html.matchAll(/href="([^"]*\/t\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  console.log(`Found ${links.length} links for الجهاد:`);
  for (const l of links) {
    const text = l[2].replace(/<[^>]+>/g, '').trim();
    console.log(`  ${l[1]} -> ${text}`);
  }
}

searchIC();
