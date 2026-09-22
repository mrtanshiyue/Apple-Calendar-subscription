const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type',
};

const CALENDAR_PREFIX = 'calendar:';
const CALENDAR_VERSION = 5;
const CHINA_SOURCE_CACHE_KEY = 'source:china-holidays:v2';
const CHINA_SOURCE_URL = 'https://cdn.jsdelivr.net/npm/chinese-days/dist/holidays.ics';
const CHINA_SOURCE_CACHE_MS = 12 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAYS = {
  初一: 1, 初二: 2, 初三: 3, 初四: 4, 初五: 5, 初六: 6, 初七: 7, 初八: 8, 初九: 9, 初十: 10,
  十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15, 十六: 16, 十七: 17, 十八: 18, 十九: 19, 二十: 20,
  廿一: 21, 廿二: 22, 廿三: 23, 廿四: 24, 廿五: 25, 廿六: 26, 廿七: 27, 廿八: 28, 廿九: 29, 三十: 30,
};

// These are stable annual dates and relative holidays. Prime Day events are
// intentionally omitted because Amazon announces their dates each year.
const DEFAULT_US_EVENT_DEFINITIONS = [
  { id: 'us-new-years-day', name: '美国元旦', rule: { type: 'fixed', month: 1, day: 1 }, note: '美国主要节日', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-mlk-day', name: '马丁·路德·金纪念日', rule: { type: 'nth-weekday', month: 1, weekday: 1, nth: 3 }, note: '一月第三个星期一', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-valentines-day', name: '情人节', rule: { type: 'fixed', month: 2, day: 14 }, note: '礼品购物节点', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-presidents-day', name: '总统日（华盛顿诞辰）', rule: { type: 'nth-weekday', month: 2, weekday: 1, nth: 3 }, note: '二月第三个星期一', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-easter', name: '复活节', rule: { type: 'easter', offset: 0 }, note: '春季主要节日', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-memorial-day', name: '阵亡将士纪念日', rule: { type: 'last-weekday', month: 5, weekday: 1 }, note: '五月最后一个星期一', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-mothers-day', name: '母亲节', rule: { type: 'nth-weekday', month: 5, weekday: 0, nth: 2 }, note: '五月第二个星期日 · 长辈礼赠节点', tag: '礼赠节日', category: 'us-holiday' },
  { id: 'us-fathers-day', name: '父亲节', rule: { type: 'nth-weekday', month: 6, weekday: 0, nth: 3 }, note: '六月第三个星期日 · 长辈礼赠节点', tag: '礼赠节日', category: 'us-holiday' },
  { id: 'us-juneteenth', name: '六月节', rule: { type: 'fixed', month: 6, day: 19 }, note: '美国联邦节日', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-independence-day', name: '美国独立日', rule: { type: 'fixed', month: 7, day: 4 }, note: '美国联邦节日', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-labor-day', name: '劳动节', rule: { type: 'nth-weekday', month: 9, weekday: 1, nth: 1 }, note: '九月第一个星期一', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-grandparents-day', name: '祖父母节', rule: { type: 'grandparents-day' }, note: '劳动节后的第一个星期日 · 长辈礼赠节点', tag: '礼赠节日', category: 'us-holiday' },
  { id: 'us-columbus-day', name: '哥伦布日 / 原住民日', rule: { type: 'nth-weekday', month: 10, weekday: 1, nth: 2 }, note: '十月第二个星期一', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-halloween', name: '万圣节', rule: { type: 'fixed', month: 10, day: 31 }, note: '美国主要节日', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-veterans-day', name: '退伍军人节', rule: { type: 'fixed', month: 11, day: 11 }, note: '美国联邦节日', tag: '美国节日', category: 'us-holiday' },
  { id: 'us-thanksgiving', name: '感恩节', rule: { type: 'nth-weekday', month: 11, weekday: 4, nth: 4 }, note: '十一月第四个星期四 · BFCM 购物季开始', tag: '购物节点', category: 'us-holiday' },
  { id: 'us-black-friday', name: '黑色星期五', rule: { type: 'after-thanksgiving', offset: 1 }, note: '感恩节次日 · 年度重点购物日', tag: '购物节点', category: 'us-holiday' },
  { id: 'us-cyber-monday', name: '网络星期一', rule: { type: 'after-thanksgiving', offset: 4 }, note: '感恩节后的星期一 · 线上购物节点', tag: '购物节点', category: 'us-holiday' },
  { id: 'us-christmas', name: '圣诞节', rule: { type: 'fixed', month: 12, day: 25 }, note: '冬季主要节日 · 长辈礼赠节点', tag: '礼赠节日', category: 'us-holiday' },
];

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
  const currentYear = new Date().getUTCFullYear();
  const calendar = {
    version: CALENDAR_VERSION,
    token,
    name: cleanText(input.name || '我的岁时日历', 80),
    events: buildDefaultEvents(currentYear),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await refreshChinaHolidayEvents(env, calendar);
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
        `CATEGORIES:${escapeIcs(categoryLabel(event.category))}`,
        event.repeatAnnual && !event.annualRule && event.dateType === 'solar' ? 'RRULE:FREQ=YEARLY' : '',
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

  const id = cleanText(input.id, 80) || createToken(10);
  const tag = cleanText(input.tag, 40) || (dateType === 'lunar' ? '农历生日' : dateType === 'holiday' ? '法定节假日' : '公历日期');
  return {
    id,
    name,
    dateType,
    date,
    lunarMonth,
    lunarDay,
    lunarLeap,
    annualRule: normalizeAnnualRule(input.annualRule),
    repeatAnnual: input.repeatAnnual === undefined ? dateType === 'solar' : Boolean(input.repeatAnnual),
    note: cleanText(input.note, 240),
    tag,
    category: normalizeCategory(input.category) || inferEventCategory({ id, name, dateType, tag }),
    color: cleanText(input.color, 20) || (dateType === 'holiday' ? 'holiday' : 'birthday'),
    updatedAt: new Date().toISOString(),
  };
}

function eventOccurrences(event) {
  if (event.annualRule) {
    const year = new Date().getUTCFullYear();
    return Array.from({ length: 10 }, (_, index) => annualRuleToDate(year + index, event.annualRule))
      .filter(Boolean)
      .map((date) => ({ date }));
  }
  if (event.dateType === 'lunar' && event.lunarMonth && event.lunarDay) {
    const year = new Date().getUTCFullYear();
    return Array.from({ length: 10 }, (_, index) => lunarToSolar(year + index, event.lunarMonth, event.lunarDay, event.lunarLeap))
      .filter(Boolean)
      .map((date) => ({ date }));
  }
  if (event.date && DATE_PATTERN.test(event.date)) return [{ date: event.date }];
  return [];
}

function buildDefaultEvents(year) {
  return DEFAULT_US_EVENT_DEFINITIONS.map((definition) => ({
    ...normalizeEvent({
      id: definition.id,
      name: definition.name,
      dateType: 'holiday',
      date: annualRuleToDate(year, definition.rule),
      annualRule: definition.rule,
      repeatAnnual: false,
      note: definition.note,
      tag: definition.tag,
      category: definition.category,
      color: 'holiday',
    }),
    system: true,
  }));
}

function normalizeCategory(value) {
  return ['birthday', 'china-holiday', 'us-holiday', 'other'].includes(value) ? value : null;
}

function inferEventCategory(event) {
  if (event.category && normalizeCategory(event.category)) return event.category;
  const text = `${event.id || ''} ${event.name || ''} ${event.tag || ''} ${event.note || ''}`;
  if (event.dateType === 'lunar' || /生日/.test(text)) return 'birthday';
  if (/^us-/.test(String(event.id || '')) || /美国|购物节点|礼赠节日/.test(text)) return 'us-holiday';
  if (event.dateType === 'holiday' || /中国|法定节假日|调休|补班/.test(text)) return 'china-holiday';
  return 'other';
}

function categoryLabel(category) {
  return ({
    birthday: '生日',
    'china-holiday': '中国节日',
    'us-holiday': '美国节日',
    other: '其他日期',
  })[normalizeCategory(category) || 'other'];
}

function normalizeAnnualRule(input) {
  if (!input || typeof input !== 'object') return null;
  const type = ['fixed', 'nth-weekday', 'last-weekday', 'easter', 'grandparents-day', 'after-thanksgiving'].includes(input.type) ? input.type : null;
  if (!type) return null;
  const month = Number(input.month);
  const day = Number(input.day);
  const weekday = Number(input.weekday);
  const nth = Number(input.nth);
  const offset = Number.isInteger(Number(input.offset)) ? Number(input.offset) : 0;
  if (type === 'fixed' && (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31)) return null;
  if (['nth-weekday', 'last-weekday'].includes(type) && (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(weekday) || weekday < 0 || weekday > 6)) return null;
  if (type === 'nth-weekday' && (!Number.isInteger(nth) || nth < 1 || nth > 5)) return null;
  return { type, ...(type === 'fixed' ? { month, day } : {}), ...(['nth-weekday', 'last-weekday'].includes(type) ? { month, weekday } : {}), ...(type === 'nth-weekday' ? { nth } : {}), ...(type === 'easter' || type === 'after-thanksgiving' ? { offset } : {}) };
}

function annualRuleToDate(year, rule) {
  if (!rule) return null;
  if (rule.type === 'fixed') return dateString(year, rule.month, rule.day);
  if (rule.type === 'nth-weekday') return nthWeekdayOfMonth(year, rule.month, rule.weekday, rule.nth);
  if (rule.type === 'last-weekday') return lastWeekdayOfMonth(year, rule.month, rule.weekday);
  if (rule.type === 'easter') return addDays(easterSunday(year), rule.offset || 0);
  if (rule.type === 'grandparents-day') return addDays(nthWeekdayOfMonth(year, 9, 1, 1), 6);
  if (rule.type === 'after-thanksgiving') return addDays(nthWeekdayOfMonth(year, 11, 4, 4), rule.offset || 0);
  return null;
}

function dateString(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}

function nthWeekdayOfMonth(year, month, weekday, nth) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const delta = (weekday - first.getUTCDay() + 7) % 7;
  return dateString(year, month, 1 + delta + (nth - 1) * 7);
}

function lastWeekdayOfMonth(year, month, weekday) {
  const last = new Date(Date.UTC(year, month, 0));
  const delta = (last.getUTCDay() - weekday + 7) % 7;
  return dateString(year, month, last.getUTCDate() - delta);
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dateString(year, month, day);
}

function lunarToSolar(year, monthName, dayName, leapMonth = false) {
  const targetMonth = lunarMonthNumber(monthName);
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
    if (lunarMonthNumber(normalizedMonth) === targetMonth && day === targetDay && isLeapMonth === leapMonth) {
      return date.toISOString().slice(0, 10);
    }
  }
  return null;
}

function lunarMonthNumber(value) {
  const normalized = String(value || '').replace(/^闰/, '');
  const aliases = { 十一月: '冬月', 十二月: '腊月' };
  return LUNAR_MONTHS.indexOf(aliases[normalized] || normalized) + 1;
}

async function refreshChinaHolidayEvents(env, calendar) {
  const sourceEvents = await getChinaHolidayEvents(env);
  if (!sourceEvents.length) return false;

  const existingSourceEvents = calendar.events.filter((event) => event.source === 'china-holidays');
  const retainedEvents = calendar.events.filter((event) => event.source !== 'china-holidays');
  const nextEvents = [...retainedEvents, ...sourceEvents];
  const changed = !sameEventSet(existingSourceEvents, sourceEvents);
  if (changed) calendar.events = nextEvents;
  return changed;
}

async function getChinaHolidayEvents(env) {
  const cached = await env.CALENDARS.get(CHINA_SOURCE_CACHE_KEY, 'json');
  const now = Date.now();
  if (cached && Array.isArray(cached.events) && now - Number(cached.fetchedAt || 0) < CHINA_SOURCE_CACHE_MS) {
    return cached.events;
  }

  try {
    const response = await fetch(CHINA_SOURCE_URL, {
      headers: { accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1' },
    });
    if (!response.ok) throw new Error(`China holiday source returned ${response.status}`);
    const text = await response.text();
    const events = parseChinaHolidayIcs(text);
    if (!events.length) throw new Error('China holiday source returned no events');
    await env.CALENDARS.put(CHINA_SOURCE_CACHE_KEY, JSON.stringify({
      sourceUrl: CHINA_SOURCE_URL,
      fetchedAt: now,
      events,
    }));
    return events;
  } catch (error) {
    console.error(JSON.stringify({ source: CHINA_SOURCE_URL, message: error instanceof Error ? error.message : String(error) }));
    return cached && Array.isArray(cached.events) ? cached.events : [];
  }
}

function parseChinaHolidayIcs(text) {
  const lines = unfoldIcs(text);
  const parsed = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) parsed.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const rawKey = line.slice(0, separator);
    const key = rawKey.split(';', 1)[0].toUpperCase();
    const value = unescapeIcs(line.slice(separator + 1));
    if (key === 'UID') current.uid = value;
    if (key === 'SUMMARY') current.summary = value;
    if (key === 'DESCRIPTION') current.description = value;
    if (key === 'DTSTART') current.start = parseIcsDate(value);
    if (key === 'DTEND') current.end = parseIcsDate(value);
  }

  const currentYear = new Date().getUTCFullYear();
  const minimumDate = `${currentYear}-01-01`;
  return parsed.flatMap((event, index) => {
    if (!event.start || !event.summary) return [];
    const isWorkday = /补班|调休|工作日|上班|[（(]班[）)]|班$/.test(`${event.summary} ${event.description || ''}`);
    const end = event.end && event.end > event.start ? event.end : addDays(event.start, 1);
    const dates = [];
    for (let date = event.start; date < end; date = addDays(date, 1)) dates.push(date);
    return dates.map((date, dateIndex) => ({
      id: `china-holiday-${stableEventId(event.uid || `${event.summary}-${index}`)}-${date}`,
      name: isWorkday ? `调休上班：${event.summary}` : event.summary,
      dateType: 'holiday',
      date,
      lunarMonth: '',
      lunarDay: '',
      lunarLeap: false,
      annualRule: null,
      repeatAnnual: false,
      note: event.description || (isWorkday ? '中国法定节假日调休安排' : '中国法定节假日安排'),
      tag: isWorkday ? '调休上班' : '法定节假日',
      category: 'china-holiday',
      color: isWorkday ? 'workday' : 'holiday',
      source: 'china-holidays',
      sourceUid: event.uid || `${event.summary}-${index}`,
      sourceDay: dateIndex,
      system: true,
    }));
  }).filter((event) => event.date >= minimumDate);
}

function unfoldIcs(text) {
  return String(text || '').replace(/\r?\n[ \t]/g, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function parseIcsDate(value) {
  const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function unescapeIcs(value) {
  return String(value || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function stableEventId(value) {
  return String(value || 'event').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'event';
}

function sameEventSet(left, right) {
  if (left.length !== right.length) return false;
  const signature = (event) => [event.id, event.name, event.date, event.note, event.tag].join('|');
  const leftSignatures = left.map(signature).sort();
  const rightSignatures = right.map(signature).sort();
  return leftSignatures.every((value, index) => value === rightSignatures[index]);
}

async function getCalendar(env, token) {
  if (!isValidToken(token)) return null;
  const value = await env.CALENDARS.get(`${CALENDAR_PREFIX}${token}`, 'json');
  if (!value || !Array.isArray(value.events)) return null;
  let calendar = value;
  let changed = false;
  if ((calendar.version || 1) < CALENDAR_VERSION) {
    const existingIds = new Set(calendar.events.map((event) => event.id));
    const migratedEvents = buildDefaultEvents(new Date().getUTCFullYear()).filter((event) => !existingIds.has(event.id));
    calendar = {
      ...calendar,
      version: CALENDAR_VERSION,
      events: [...calendar.events.map((event) => migrateStoredEvent(event)), ...migratedEvents],
      updatedAt: new Date().toISOString(),
    };
    changed = true;
  }
  if (await refreshChinaHolidayEvents(env, calendar)) changed = true;
  if (changed) {
    calendar.updatedAt = new Date().toISOString();
    await saveCalendar(env, calendar);
  }
  return calendar;
}

function migrateStoredEvent(event) {
  const migrated = { ...event, category: normalizeCategory(event.category) || inferEventCategory(event) };
  if (migrated.dateType === 'lunar' && migrated.lunarMonth && migrated.lunarDay && !migrated.date) {
    migrated.date = lunarToSolar(new Date().getUTCFullYear(), migrated.lunarMonth, migrated.lunarDay, Boolean(migrated.lunarLeap));
  }
  return migrated;
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
