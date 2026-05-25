import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { level = 'intermediate', theme = 'workplace communication' } = req.body || {};
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      messages: [{ role: 'user', content: `Generate 5 English vocabulary words for a ${level} learner. Theme: ${theme}. Return ONLY valid JSON no markdown: {"words":[{"word":"","phonetic":"","type":"","meaning":"","example":"","tamil_meaning":""}]}` }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(clean));
  } catch(e) { res.status(500).json({ error: 'Failed', details: e.message }); }
}
