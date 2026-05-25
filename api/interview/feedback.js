import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { question, answer, topic } = req.body || {};
  if (!answer) return res.status(400).json({ error: 'No answer' });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 800,
      messages: [{ role: 'user', content: `You are an interview coach for Indian engineering students. Question: "${question}". Answer: "${answer}". Topic: ${topic}. Give specific feedback in 3-4 sentences. Return ONLY valid JSON: {"feedback":"","score":75,"followup_question":""}` }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(clean));
  } catch(e) { res.status(500).json({ error: 'Failed', details: e.message }); }
}
