module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { level = 'intermediate', theme = 'workplace communication' } = req.body || {};
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama3-8b-8192', max_tokens: 1000,
        messages: [{ role: 'user', content: `Generate 5 English vocabulary words for a ${level} learner. Theme: ${theme}. Return ONLY valid JSON, no markdown: {"words":[{"word":"","phonetic":"","type":"","meaning":"","example":"","tamil_meaning":""}]}` }]
      })
    });
    const data = await response.json();
    const text = data.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(text));
  } catch(e) { res.status(500).json({ error: 'Failed', details: e.message }); }
};
