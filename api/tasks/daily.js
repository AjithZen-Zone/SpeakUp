import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { level = 'intermediate' } = req.body || {};
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      messages: [{ role: 'user', content: `Generate daily communication tasks for a ${level} English learner (Indian engineering student). Return ONLY valid JSON no extra text: {"theme":"3 word theme","writing_prompt":"interesting prompt question","grammar_tip":"one rule with example","accent_focus":"one sound or pattern","interview_question":"one HR question"}` }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(clean));
  } catch(e) { res.status(500).json({ error: 'Failed', details: e.message }); }
}
