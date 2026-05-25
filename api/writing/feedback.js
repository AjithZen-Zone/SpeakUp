module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { text, prompt } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama3-8b-8192', max_tokens: 1000,
        messages: [{ role: 'user', content: `You are an English communication coach. Prompt: "${prompt}". Student response: "${text}". Return ONLY valid JSON no markdown: {"clarity":85,"grammar":80,"vocabulary":75,"overall":80,"feedback":"2-3 sentence feedback","strengths":"one strength","improvement":"one specific tip"}` }]
      })
    });
    const data = await response.json();
    const clean = data.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(clean));
  } catch(e) { res.status(500).json({ error: 'Failed', details: e.message }); }
};
