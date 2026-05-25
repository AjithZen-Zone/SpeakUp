const { createClient } = require('@supabase/supabase-js');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (req.headers['x-owner-key'] !== process.env.OWNER_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  try {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: payments } = await supabase.from('payments').select('*').eq('status','captured').order('created_at',{ ascending: false });
    const { data: authData } = await supabase.auth.admin.listUsers();
    const emailMap = {};
    authData?.users?.forEach(u => { emailMap[u.id] = u.email; });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalRevenue = payments?.reduce((s,p) => s + p.amount, 0) || 0;
    const monthRevenue = payments?.filter(p => new Date(p.created_at) >= monthStart).reduce((s,p) => s + p.amount, 0) || 0;
    const usersWithEmail = (profiles || []).map(p => ({ ...p, email: emailMap[p.id] || '—' }));
    res.json({
      users: {
        total: profiles?.length || 0,
        pro: profiles?.filter(p => p.plan === 'pro').length || 0,
        trial: profiles?.filter(p => p.plan === 'trial').length || 0,
        free: profiles?.filter(p => p.plan === 'free').length || 0
      },
      revenue: {
        total_inr: totalRevenue / 100,
        this_month_inr: monthRevenue / 100,
        total_payments: payments?.length || 0
      },
      recent_payments: payments?.slice(0, 10) || [],
      all_users: usersWithEmail
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
};
