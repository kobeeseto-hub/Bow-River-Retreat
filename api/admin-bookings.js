const { supabaseFetch, TABLE } = require('./_supabase');
const { sendApproved, sendDeclined, sendCancelled } = require('./_email');

function authorized(req) {
  const password = process.env.ADMIN_PASSWORD;
  return password && req.headers['x-admin-password'] === password;
}

module.exports = async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    if (req.method === 'GET') {
      const data = await supabaseFetch(`${TABLE}?select=*&order=created_at.desc`, { method: 'GET' });
      return res.status(200).json({ bookings: data || [] });
    }
    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      if (!id || !['pending','approved','declined','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid request' });
      const data = await supabaseFetch(`${TABLE}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      const booking = data && data[0];
      let email = null;
      try {
        if (booking && status === 'approved') email = await sendApproved(booking);
        if (booking && status === 'declined') email = await sendDeclined(booking);
        if (booking && status === 'cancelled') email = await sendCancelled(booking);
      } catch (emailError) {
        console.error(`${status} email failed:`, emailError.message);
        email = { error: emailError.message };
      }
      return res.status(200).json({ ok: true, booking, email });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      const data = await supabaseFetch(TABLE, { method: 'POST', body: JSON.stringify({
        guest_name: body.guest_name || 'Owner Block',
        email: body.email || 'owner@bowriverretreat.local',
        phone: body.phone || '',
        check_in: body.check_in,
        check_out: body.check_out,
        guests: Number(body.guests || 0),
        status: body.status || 'approved'
      }) });
      return res.status(200).json({ ok: true, booking: data && data[0] });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
