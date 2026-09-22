const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type',
};

const CALENDAR_PREFIX = 'calendar:';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, '') || '/';

      if (path === '/health') {
        return json({ ok: true, service: 'suishi-calendar-api', time: new Date().toISOString() });
      }

      if (path === '/api/calendars' && request.method === 'POST') {
        return createCalendar(request, env);
      }

      const calendarMatch = path.match(/^\/api\/calendar\/([^/]+)\.ics$/);
      if (calendarMatch && request.method === 'GET') {
        return renderCalendar(env, decodeURIComponent(calendarMatch[1]));
      }

      const eventsMatch = path.match(/^\/api\/calendars\/([^/]+)\/events$/);
      if (eventsMatch) {
        const token = decodeURIComponent(eventsMatch[1]);
        if (request.method === 'GET') return listEvents(env, token);
        if (request.method === 'POST') return addEvent(request, env, token);
      }

      const eventMatch = path.match(/^\/api\/calendars\/([^/]+)\/events\/([^/]+)$/);
      if (eventMatch) {
        const token = decodeURIComponent(eventMatch[1]);
        const eventId = decodeURIComponent(eventMatch[2]);
        if (request.method === 'PUT') return updateEvent(request, env, token, eventId);
        if (request.method === 'DELETE') return deleteEvent(env, token, eventId);
      }

      return json({ error: 'Not found' }, 404);
    } catch (error) {
      console.error(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
      return json({ error: '服务器暂时无法处理请求。' }, 500);
    }
  },
};

async function createCalendar(request, env) {
  const input = await readJson(request);
  const token = createToken();
  const calendar = {
    version: 1,
    token,
    name: cleanText(input.name || '我的岁时日历', 80),
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveCalendar(env, calendar);
  return json({
    calendar: publicCalendar(calendar),
    subscriptionUrl: new URL(`/api/calendar/${token}.ics`, request.url).toString(),
  }, 201);
}

async function listEvents(env, token) {
  const calendar = await getCalendar(env, token);
  if (!calendar) return json({ error: '日历不存在或订阅链接已失效。' }, 404);
  return json({ calendar: publicCalendar(calendar), events: calendar.events });
}

async function addEvent(request, env, token) {
  const calendar = await getCalendar(env, token);
  if (!calendar) return json({ error: '日历不存在或订阅链接已失效。' }, 404);
  const input = await readJson(request);
  const event = normalizeEvent(input);
  calendar.events.push(event);
  calendar.updatedAt = new Date().toISOString();
  await saveCalendar(env, calendar);
  return json({ event }, 201);
}

async function updateEvent(request, env, token, eventId) {
  const calendar = await getCalendar(env, token);
  if (!calendar) return json({ error: '日历不存在或订阅链接已失效。' }, 404);
  const index = calendar.events.findIndex((event) => event.id === eventId);
  if (index < 0) return json({ error: '日期不存在。' }, 404);
  const input = await readJson(request);
  calendar.events[index] = normalizeEvent({ ...calendar.events[index], ...input, id: eventId });
  calendar.updatedAt = new Date().toISOString();
  await saveCalendar(env, calendar);
  return json({ event: calendar.events[index] });
}

async function deleteEvent(env, token, eventId) {
  const calendar = await getCalendar(env, token);
  if (!calendar) return json({ error: '日历不存在或订阅链接已失效。' }, 404);
  const originalLength = calendar.events.length;
  calendar.events = calendar.events.filter((event) => event.id !== eventId);
  if (calendar.events.length === originalLength) return json({ error: '日期不存在。' }, 404);
  calendar.updatedAt = new Date().toISOString();
  await saveCalendar(env, calendar);
  return json({ ok: true });
}

async function renderCalendar(env, token) {
  const calendar = await getCalendar(env, token);
  if (!calendar) return new Response('Calendar not found', { status: 404 });

  const ics = makeIcs(calendar);
  return new Response(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'no-cache, no-store, must-revalidate',
      'access-control-allow-origin': '*',
    },
  });
}

function makeIcs(calendar) {
  const stamp = toIcsDateTime(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Suishi//Apple Calendar Subscription//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + escapeIcs(calendar.name),
    'X-WR-TIMEZONE:Asia/Shanghai',
  ];

  for (const event of calendar.events.filter((item) => item.date && DATE_PATTERN.test(item.date))) {
    const start = toIcsDate(event.date);
    const end = toIcsDate(addDays(event.date, 1));
    const description = [event.note, event.dateType === 'lunar' ? `农历${event.lunarMonth || ''}${event.lunarDay || ''}` : ''].filter(Boolean).join(' · ');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@suishi-calendar`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeIcs(event.name)}`,
      description ? `DESCRIPTION:${escapeIcs(description)}` : '',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.filter(Boolean).join('\r\n')}\r\n`;
}

function normalizeEvent(input) {
  const name = cleanText(input.name, 100);
  if (!name) throw new Error('日期名称不能为空。');

  const dateType = ['lunar', 'solar', 'holiday'].includes(input.dateType) ? input.dateType : 'solar';
  const date = typeof input.date === 'string' && DATE_PATTERN.test(input.date) ? input.date : null;
  if (dateType !== 'lunar' && !date) throw new Error('公历日期格式不正确。');

  return {
    id: cleanText(input.id, 80) || createToken(10),
    name,
    dateType,
    date,
    lunarMonth: cleanText(input.lunarMonth || input.month, 20),
    lunarDay: cleanText(input.lunarDay || input.day, 20),
    note: cleanText(input.note, 240),
    tag: cleanText(input.tag, 40) || (dateType === 'lunar' ? '农历生日' : dateType === 'holiday' ? '法定节假日' : '公历日期'),
    updatedAt: new Date().toISOString(),
  };
}

async function getCalendar(env, token) {
  if (!isValidToken(token)) return null;
  const value = await env.CALENDARS.get(`${CALENDAR_PREFIX}${token}`, 'json');
  return value && Array.isArray(value.events) ? value : null;
}

async function saveCalendar(env, calendar) {
  await env.CALENDARS.put(`${CALENDAR_PREFIX}${calendar.token}`, JSON.stringify(calendar));
}

function publicCalendar(calendar) {
  return { name: calendar.name, token: calendar.token, createdAt: calendar.createdAt, updatedAt: calendar.updatedAt };
}

async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('请求必须使用 JSON。');
  const input = await request.json();
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('请求内容不正确。');
  return input;
}

function createToken(length = 24) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isValidToken(token) { return typeof token === 'string' && /^[a-f0-9]{16,64}$/i.test(token); }
function cleanText(value, maxLength) { return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''; }
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS }); }
function toIcsDate(value) { return value.replaceAll('-', ''); }
function toIcsDateTime(date) { return date.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z'); }
function addDays(value, days) { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
function escapeIcs(value) { return String(value).replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll(/\r?\n/g, '\\n'); }
