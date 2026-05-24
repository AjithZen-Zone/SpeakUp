require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── HEALTH CHECK ───────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── GENERATE DAILY VOCAB ────────────────────────────────────
app.post('/api/vocab/generate', async (req, res) => {
  const { level = 'intermediate', theme = 'workplace communication' } = req.body;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Generate 5 English vocabulary words for a ${level} learner. Theme: ${theme}.
Return ONLY valid JSON in this exact format, no extra text:
{"words":[{"word":"","phonetic":"","type":"","meaning":"","example":"","tamil_meaning":""}]}`
      }]
    });
    const text = msg.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate vocabulary' });
  }
});

// ─── WRITING FEEDBACK ────────────────────────────────────────
app.post('/api/writing/feedback', async (req, res) => {
  const { text, prompt } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are an English communication coach. The student was given this prompt: "${prompt}"
Their response: "${text}"
Give constructive feedback. Return ONLY valid JSON:
{"clarity":85,"grammar":80,"vocabulary":75,"overall":80,"feedback":"2-3 sentence feedback","strengths":"one strength","improvement":"one specific tip"}`
      }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// ─── INTERVIEW FEEDBACK ──────────────────────────────────────
app.post('/api/interview/feedback', async (req, res) => {
  const { question, answer, topic } = req.body;
  if (!answer) return res.status(400).json({ error: 'No answer provided' });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are a strict but encouraging interview coach for Indian engineering students. 
Question: "${question}"
Candidate's answer: "${answer}"
Topic type: ${topic}
Give specific, actionable feedback in 3-4 sentences. Mention what was good and what to improve. 
Return ONLY valid JSON: {"feedback":"","score":75,"followup_question":""}`
      }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// ─── GENERATE DAILY TASKS ────────────────────────────────────
app.post('/api/tasks/daily', async (req, res) => {
  const { level = 'intermediate' } = req.body;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `Generate today's communication tasks for a ${level} English learner (Indian engineering student preparing for placements).
Return ONLY valid JSON:
{
  "theme": "today's theme in 3 words",
  "writing_prompt": "an interesting writing prompt question",
  "grammar_tip": "one grammar rule with example",
  "reading_topic": "a topic for reading practice",
  "accent_focus": "one specific sound or pattern to practice today",
  "interview_question": "one HR or behavioral interview question"
}`
      }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
});

// ─── SUPABASE: SAVE PROGRESS ─────────────────────────────────
app.post('/api/progress/save', async (req, res) => {
  const { user_id, date, module, completed, score, xp } = req.body;
  try {
    const { data, error } = await supabase.from('progress').upsert({
      user_id, date, module, completed, score, xp, updated_at: new Date()
    }, { onConflict: 'user_id,date,module' });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ─── SUPABASE: GET PROGRESS ──────────────────────────────────
app.get('/api/progress/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user_id)
      .order('date', { ascending: false });
    if (error) throw error;
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SUPABASE: UPDATE STREAK ─────────────────────────────────
app.post('/api/streak/update', async (req, res) => {
  const { user_id, date } = req.body;
  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user_id).single();
    const lastDate = profile?.last_completed_date;
    const today = new Date(date);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    let newStreak = 1;
    if (lastDate) {
      const last = new Date(lastDate);
      if (last.toDateString() === yesterday.toDateString()) newStreak = (profile.streak || 0) + 1;
      else if (last.toDateString() === today.toDateString()) newStreak = profile.streak || 1;
    }
    const { error } = await supabase.from('profiles').upsert({
      id: user_id, streak: newStreak, last_completed_date: date,
      total_days_completed: (profile?.total_days_completed || 0) + (lastDate !== date ? 1 : 0),
      updated_at: new Date()
    });
    if (error) throw error;
    res.json({ streak: newStreak });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SERVE FRONTEND ──────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SpeakUp server running on http://localhost:${PORT}`));
