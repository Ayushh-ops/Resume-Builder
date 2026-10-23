import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const key = env.match(/VITE_GEMINI_API_KEY=(.*)/)[1].trim().replace(/^['"]|['"]$/g, '');
const models = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

async function test() {
  for (const m of models) {
    const t0 = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ok' }] }] })
      });
      const ms = Date.now() - t0;
      const body = await res.text();
      let statusSnippet = '';
      try {
        const j = JSON.parse(body);
        statusSnippet = j.error?.message || j.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch {
        statusSnippet = body.slice(0, 100);
      }
      console.log(`${m.padEnd(24)} | status: ${res.status} | ${ms}ms | ${statusSnippet.slice(0, 80).replace(/\n/g, ' ')}`);
    } catch (e) {
      console.log(`${m.padEnd(24)} | error: ${e.message}`);
    }
  }
}
test();
