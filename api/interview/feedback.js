export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { question, answer, topic } = req.body || {};
  if (!answer) return res.status(400).json({ error: 'No answer' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `You are a strict but encouraging interview coach for Indian engineering students preparing for campus placements. Interview question: "${question}". Candidate answer: "${answer}". Topic type: ${topic}. Give specific actionable feedback in 3-4 sentences. Mention what was good and what to improve. Return ONLY valid JSON no markdown: {"feedback":"your feedback here","score":75,"followup_question":"a relevant follow up question"}`
        }]
      })
    });
    const data = await response.json();
    const clean = data.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(clean));
  } catch(e) { res.status(500).json({ error: 'Failed', details: e.message }); }
}
