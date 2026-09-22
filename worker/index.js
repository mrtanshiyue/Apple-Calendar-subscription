const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type',
};

const CALENDAR_PREFIX = 'calendar:';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAYS = {
  初一: 1, 初二: 2, 初三: 3, 初四: 4, 初五: 5, 初六: 6, 初七: 7, 初八: 8, 初九: 9, 初十: 10,
  十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15, 十六: 16, 十七: 17, 十八: 18, 十九: 19, 二十: 20,
  廿一: 21, 廿二: 22, 廿三: 23, 廿四: 24, 廿五: 25, 廿六: 26, 廿七: 27, 廿八: 28, 廿九: 29, 三十: 30,
};

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

  for (const event of calendar.events) {
    const occurrences = eventOccurrences(event);
    for (const occurrence of occurrences) {
      const start = toIcsDate(occurrence.date);
      const end = toIcsDate(addDays(occurrence.date, 1));
      const description = [event.note, event.dateType === 'lunar' ? `农历${event.lunarMonth || ''}${event.lunarDay || ''}` : ''].filter(Boolean).join(' · ');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${event.id}-${occurrence.date}@suishi-calendar`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${escapeIcs(event.name)}`,
        event.repeatAnnual && event.dateType === 'solar' ? 'RRULE:FREQ=YEARLY' : '',
        description ? `DESCRIPTION:${escapeIcs(description)}` : '',
        'END:VEVENT',
      );
    }
  }

  lines.push('END:VCALENDAR');
  return `${lines.filter(Boolean).join('\r\n')}\r\n`;
}

function normalizeEvent(input) {
  const name = cleanText(input.name, 100);
  if (!name) throw new Error('日期名称不能为空。');

  const dateType = ['lunar', 'solar', 'holiday'].includes(input.dateType) ? input.dateType : 'solar';
  const suppliedDate = typeof input.date === 'string' && DATE_PATTERN.test(input.date) ? input.date : null;
  const lunarMonth = cleanText(input.lunarMonth || input.month, 20);
  const lunarDay = cleanText(input.lunarDay || input.day, 20);
  const lunarLeap = Boolean(input.lunarLeap || input.isLeapMonth);
  const date = dateType === 'lunar' ? lunarToSolar(new Date().getUTCFullYear(), lunarMonth, lunarDay, lunarLeap) : suppliedDate;
  if (dateType !== 'lunar' && !date) throw new Error('公历日期格式不正确。');

  return {
    id: cleanText(input.id, 80) || createToken(10),
    name,
    dateType,
    date,
    lunarMonth,
    lunarDay,
    lunarLeap,
    repeatAnnual: input.repeatAnnual === undefined ? dateType === 'solar' : Boolean(input.repeatAnnual),
    note: cleanText(input.note, 240),
    tag: cleanText(input.tag, 40) || (dateType === 'lunar' ? '农历生日' : dateType === 'holiday' ? '法定节假日' : '公历日期'),
    updatedAt: new Date().toISOString(),
  };
}

function eventOccurrences(event) {
  if (event.dateType === 'lunar' && event.lunarMonth && event.lunarDay) {
    const year = new Date().getUTCFullYear();
    return Array.from({ length: 10 }, (_, index) => lunarToSolar(year + index, event.lunarMonth, event.lunarDay, event.lunarLeap))
      .filter(Boolean)
      .map((date) => ({ date }));
  }
  if (event.date && DATE_PATTERN.test(event.date)) return [{ date: event.date }];
  return [];
}

function lunarToSolar(year, monthName, dayName, leapMonth = false) {
  const targetMonth = LUNAR_MONTHS.indexOf(String(monthName).replace(/^闰/, '')) + 1;
  const targetDay = LUNAR_DAYS[dayName] || Number(dayName);
  if (!targetMonth || !targetDay || targetDay > 30) return null;

  const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' });
  const cursor = new Date(Date.UTC(year, 0, 1, 12));
  for (let offset = 0; offset < 370; offset += 1) {
    const date = new Date(cursor);
    date.setUTCDate(date.getUTCDate() + offset);
    const parts = formatter.formatToParts(date);
    const month = parts.find((part) => part.type === 'month')?.value || '';
    const day = Number(parts.find((part) => part.type === 'day')?.value);
    const isLeapMonth = month.startsWith('闰');
    const normalizedMonth = month.replace(/^闰/, '');
    if (LUNAR_MONTHS.indexOf(normalizedMonth) + 1 === targetMonth && day === targetDay && isLeapMonth === leapMonth) {
      return date.toISOString().slice(0, 10);
    }
  }
  return null;
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
