import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { text, prompt } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text' });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      messages: [{ role: 'user', content: `You are an English communication coach. Prompt: "${prompt}". Student response: "${text}". Return ONLY valid JSON: {"clarity":85,"grammar":80,"vocabulary":75,"overall":80,"feedback":"2-3 sentence feedback","strengths":"one strength","improvement":"one specific tip"}` }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(clean));
  } catch(e) { res.status(500).json({ error: 'Failed', details: e.message }); }
}
