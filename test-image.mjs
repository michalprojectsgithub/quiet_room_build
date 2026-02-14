import 'dotenv/config';
import fs from 'node:fs';
import OpenAI from 'openai';

console.log('Key loaded?', !!process.env.OPENAI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

try {
  const result = await openai.images.generate({
    model: 'dall-e-3',
    prompt: 'Black-and-white pencil sketch, minimal line art, simple outlines: a cat',
    size: '1024x1024',
    n: 1
  });

  console.log('Result keys:', Object.keys(result || {}));
  console.log('data length:', result?.data?.length || 0);
  console.log('first item keys:', result?.data?.[0] ? Object.keys(result.data[0]) : []);

  const first = result?.data?.[0];
  if (first?.b64_json) {
    fs.writeFileSync('test.png', Buffer.from(first.b64_json, 'base64'));
    console.log('✅ Wrote test.png from b64_json');
  } else if (first?.url) {
    const r = await fetch(first.url);
    if (!r.ok) throw new Error(`Fetch URL failed: HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync('test.png', buf);
    console.log('✅ Wrote test.png by downloading URL');
  } else {
    console.log('❌ No b64_json or url in first item. Raw first item:', first);
  }
} catch (e) {
  console.error('❌ SDK error:', e.status || '', e.message || e);
}
