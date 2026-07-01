const CALENDAR_ID = '2e69d9b24fdff8129eb8cdd5aed194dbd037371bf43b3d05f1ebe1f79d6d309e@group.calendar.google.com';

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function unfoldICS(text) {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
}

function parseICSDate(value) {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  const dateTime = value.match(/^(\d{4})(\d{2})(\d{2})T/);
  if (dateTime) return new Date(Number(dateTime[1]), Number(dateTime[2]) - 1, Number(dateTime[3]));
  return null;
}

function parseICSBookedDates(ics) {
  const lines = unfoldICS(ics);
  const booked = new Set();
  let inEvent = false;
  let start = null;
  let end = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      start = null;
      end = null;
      continue;
    }

    if (line === 'END:VEVENT') {
      if (start) {
        const finalEnd = end || addDays(start, 1);
        for (let d = new Date(start); d < finalEnd; d = addDays(d, 1)) {
          booked.add(dateKey(d));
        }
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;
    if (line.startsWith('DTSTART')) start = parseICSDate(line.split(':').pop());
    if (line.startsWith('DTEND')) end = parseICSDate(line.split(':').pop());
  }

  return Array.from(booked).sort();
}

module.exports = async function handler(req, res) {
  const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;

  try {
    const response = await fetch(icsUrl, { cache: 'no-store' });
    if (!response.ok) {
      res.status(response.status).json({ error: 'Unable to load Google Calendar', bookedDates: [] });
      return;
    }

    const ics = await response.text();
    const bookedDates = parseICSBookedDates(ics);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ bookedDates });
  } catch (error) {
    res.status(500).json({ error: 'Calendar sync failed', bookedDates: [] });
  }
};
