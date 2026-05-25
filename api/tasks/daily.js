export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { level = 'intermediate' } = req.body || {};
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Generate today's communication tasks for a ${level} English learner who is an Indian engineering student preparing for campus placements. Return ONLY valid JSON no markdown no extra text: {"theme":"3 word theme","writing_prompt":"an interesting writing prompt question","grammar_tip":"one grammar rule with example","accent_focus":"one specific sound or pattern to practice","interview_question":"one HR or behavioral interview question"}`
        }]
      })
    });
    const data = await response.json();
    const clean = data.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(clean));
  } catch(e) { res.status(500).json({ error: 'Failed', details: e.message }); }
}
