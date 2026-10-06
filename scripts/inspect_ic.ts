async function inspectIslamicContent() {
  const homeRes = await fetch('https://islamic-content.com', {
    headers: { 'User-Agent': 'Mozilla/5.0 MishkatTest/1.0' },
  });
  console.log('Homepage status:', homeRes.status);
  const text = await homeRes.text();
  console.log('Homepage links containing /t/ :');
  const termMatches = [...text.matchAll(/href="(\/t\/\d+)"[^>]*>(.*?)<\/a>/g)];
  console.log(`Found ${termMatches.length} term links:`);
  for (const m of termMatches.slice(0, 15)) {
    console.log(`  ${m[1]}: ${m[2].trim()}`);
  }

  // Also check if there is an API or search form
  const forms = [...text.matchAll(/<form[^>]*action="([^"]*)"[^>]*>/gi)];
  console.log('Forms found:', forms.map(f => f[1]));
}

inspectIslamicContent();
