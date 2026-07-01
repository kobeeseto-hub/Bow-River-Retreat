const { supabaseFetch, TABLE } = require('./_supabase');

function isDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || ''); }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body || {};
    const booking = {
      guest_name: String(body.guest_name || '').trim(),
      email: String(body.email || '').trim(),
      phone: String(body.phone || '').trim(),
      check_in: String(body.check_in || '').trim(),
      check_out: String(body.check_out || '').trim(),
      guests: Number(body.guests || 0),
      status: 'pending'
    };
    if (!booking.guest_name || !booking.email || !isDate(booking.check_in) || !isDate(booking.check_out) || !booking.guests) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }
    if (booking.check_out <= booking.check_in) {
      return res.status(400).json({ error: 'Check-out must be after check-in' });
    }
    const data = await supabaseFetch(TABLE, { method: 'POST', body: JSON.stringify(booking) });
    res.status(200).json({ ok: true, booking: data && data[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
