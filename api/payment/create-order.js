import Razorpay from 'razorpay';
const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { user_id, user_email, user_name } = req.body || {};
  try {
    const order = await rzp.orders.create({
      amount: 19900, currency: 'INR',
      receipt: `su_${user_id?.slice(0,8)}_${Date.now()}`,
      notes: { user_id, user_email, user_name }
    });
    res.json({ order_id: order.id, amount: 19900, key: process.env.RAZORPAY_KEY_ID });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
