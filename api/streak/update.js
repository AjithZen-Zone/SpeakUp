import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { user_id, date } = req.body || {};
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
    await supabase.from('profiles').upsert({
      id: user_id, streak: newStreak, last_completed_date: date,
      best_streak: Math.max(newStreak, profile?.best_streak || 0),
      total_days_completed: (profile?.total_days_completed || 0) + (lastDate !== date ? 1 : 0),
      updated_at: new Date()
    });
    res.json({ streak: newStreak });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
