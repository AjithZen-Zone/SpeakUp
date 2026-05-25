module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { question, answer, topic } = req.body || {};
  if (!answer) return res.status(400).json({ error: 'No answer' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama3-8b-8192', max_tokens: 800,
        messages: [{ role: 'user', content: `You are an interview coach for Indian engineering students. Question: "${question}". Answer: "${answer}". Topic: ${topic}. Give specific feedback in 3-4 sentences. Return ONLY valid JSON no markdown: {"feedback":"","score":75,"followup_question":""}` }]
      })
    });
    const data = await response.json();
    const clean = data.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(clean));
  } catch(e) { res.status(500).json({ error: 'Failed', details: e.message }); }
};
