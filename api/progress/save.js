import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { user_id, date, module, completed, score, xp } = req.body || {};
  try {
    const { error } = await supabase.from('progress').upsert(
      { user_id, date, module, completed, score, xp, updated_at: new Date() },
      { onConflict: 'user_id,date,module' }
    );
    if (error) throw error;
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
