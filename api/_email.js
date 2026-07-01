function formatDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
}

function nights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '—';
  const a = new Date(`${checkIn}T00:00:00`);
  const b = new Date(`${checkOut}T00:00:00`);
  return Math.max(0, Math.round((b - a) / 86400000));
}

function bookingSummary(booking) {
  return `${formatDate(booking.check_in)} to ${formatDate(booking.check_out)} (${nights(booking.check_in, booking.check_out)} night${nights(booking.check_in, booking.check_out) === 1 ? '' : 's'})`;
}

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured. Skipping email:', subject);
    return { skipped: true, reason: 'Missing RESEND_API_KEY' };
  }

  const from = process.env.EMAIL_FROM || 'Bow River Retreat <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html, text })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && (data.message || data.error) ? (data.message || data.error) : 'Email failed to send';
    throw new Error(message);
  }
  return data;
}

function baseEmail({ title, body, booking }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#132318;line-height:1.6">
    <div style="background:#122319;color:#fff;padding:22px 26px;border-radius:14px 14px 0 0">
      <div style="font-size:12px;letter-spacing:.25em;text-transform:uppercase;color:#c99b58">Bow River Retreat</div>
      <h1 style="font-family:Georgia,serif;margin:8px 0 0;font-size:30px">${title}</h1>
    </div>
    <div style="background:#fffdf8;border:1px solid #eadfce;border-top:0;padding:26px;border-radius:0 0 14px 14px">
      ${body}
      <div style="margin-top:22px;padding:18px;background:#fbf6ee;border:1px solid #eadfce;border-radius:12px">
        <strong>Stay request</strong><br>
        Dates: ${bookingSummary(booking)}<br>
        Guests: ${booking.guests || '—'}
      </div>
      <p style="margin-top:22px;color:#5d665e;font-size:14px">Bow River Retreat<br>634A 7 St, Canmore, AB</p>
    </div>
  </div>`;
}

async function sendRequestReceived(booking) {
  if (!booking.email) return;
  const subject = 'We received your Bow River Retreat booking request';
  const html = baseEmail({
    title: 'Booking Request Received',
    booking,
    body: `<p>Hi ${booking.guest_name || 'there'},</p>
      <p>Thank you for your interest in Bow River Retreat. We received your booking request and will review it shortly.</p>
      <p>We typically respond within 24 hours.</p>`
  });
  return sendEmail({ to: booking.email, subject, html, text: `We received your Bow River Retreat booking request for ${bookingSummary(booking)}.` });
}

async function sendApproved(booking) {
  if (!booking.email) return;
  const subject = 'Your Bow River Retreat booking is approved';
  const html = baseEmail({
    title: 'Booking Approved',
    booking,
    body: `<p>Hi ${booking.guest_name || 'there'},</p>
      <p>Great news — your stay at Bow River Retreat has been approved.</p>
      <p>We look forward to hosting you in Canmore. Payment details and check-in information will be arranged separately.</p>`
  });
  return sendEmail({ to: booking.email, subject, html, text: `Your Bow River Retreat booking has been approved for ${bookingSummary(booking)}.` });
}

async function sendDeclined(booking) {
  if (!booking.email) return;
  const subject = 'Update on your Bow River Retreat booking request';
  const html = baseEmail({
    title: 'Booking Request Declined',
    booking,
    body: `<p>Hi ${booking.guest_name || 'there'},</p>
      <p>Thank you for your interest in Bow River Retreat.</p>
      <p>Unfortunately, we are not able to accommodate your requested dates. We apologize for the inconvenience and hope you will consider staying with us another time.</p>`
  });
  return sendEmail({ to: booking.email, subject, html, text: `Unfortunately, we are not able to accommodate your Bow River Retreat request for ${bookingSummary(booking)}.` });
}

async function sendCancelled(booking) {
  if (!booking.email) return;
  const subject = 'Your Bow River Retreat booking has been cancelled';
  const html = baseEmail({
    title: 'Booking Cancelled',
    booking,
    body: `<p>Hi ${booking.guest_name || 'there'},</p>
      <p>This note confirms that your Bow River Retreat booking has been cancelled.</p>
      <p>Please contact us if you have any questions.</p>`
  });
  return sendEmail({ to: booking.email, subject, html, text: `Your Bow River Retreat booking for ${bookingSummary(booking)} has been cancelled.` });
}

module.exports = { sendRequestReceived, sendApproved, sendDeclined, sendCancelled };
