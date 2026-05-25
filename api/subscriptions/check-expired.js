const { createClient } = require('@supabase/supabase-js');
module.exports = async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  try {
    const now = new Date().toISOString();
    const { data: expiredPro } = await supabase.from('profiles').select('id').eq('plan','pro').lt('subscription_end_date', now);
    const { data: expiredTrials } = await supabase.from('profiles').select('id').eq('plan','trial').lt('trial_end_date', now);
    if (expiredPro?.length) await supabase.from('profiles').update({ plan: 'free' }).in('id', expiredPro.map(u => u.id));
    if (expiredTrials?.length) await supabase.from('profiles').update({ plan: 'free' }).in('id', expiredTrials.map(u => u.id));
    res.json({ expired_pro: expiredPro?.length || 0, expired_trials: expiredTrials?.length || 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
};
