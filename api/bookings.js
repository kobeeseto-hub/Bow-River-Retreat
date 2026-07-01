const { supabaseFetch, TABLE } = require('./_supabase');

function addDays(date, days) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rows = await supabaseFetch(`${TABLE}?select=id,check_in,check_out,status&status=eq.approved&order=check_in.asc`, { method: 'GET' });
    const bookedDates = [];
    for (const row of rows || []) {
      let d = row.check_in;
      while (d && row.check_out && d < row.check_out) {
        bookedDates.push(d);
        d = addDays(d, 1);
      }
    }
    res.status(200).json({ bookings: rows || [], bookedDates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
