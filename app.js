const demoEvents = [
  { id: 1, name: '妈妈生日', dateType: 'lunar', month: '八月', day: '初八', date: '2026-09-19', note: '记得提前订花', tag: '农历生日', color: 'birthday' },
  { id: 2, name: '国庆节', dateType: 'holiday', month: '', day: '', date: '2026-10-01', note: '放假 7 天 · 10 月 10 日补班', tag: '法定节假日', color: 'holiday' },
  { id: 3, name: '外婆生日', dateType: 'lunar', month: '九月', day: '廿三', date: '2026-11-03', note: '农历九月廿三', tag: '农历生日', color: 'birthday' },
];

const defaultUsEvents = [
  { id: 'us-new-years-day', name: '美国元旦', date: '2026-01-01', note: '美国主要节日', tag: '美国节日', color: 'holiday' },
  { id: 'us-mlk-day', name: '马丁·路德·金纪念日', date: '2026-01-19', note: '一月第三个星期一', tag: '美国节日', color: 'holiday' },
  { id: 'us-valentines-day', name: '情人节', date: '2026-02-14', note: '礼品购物节点', tag: '美国节日', color: 'holiday' },
  { id: 'us-presidents-day', name: '总统日（华盛顿诞辰）', date: '2026-02-16', note: '二月第三个星期一', tag: '美国节日', color: 'holiday' },
  { id: 'us-easter', name: '复活节', date: '2026-04-05', note: '春季主要节日', tag: '美国节日', color: 'holiday' },
  { id: 'us-memorial-day', name: '阵亡将士纪念日', date: '2026-05-25', note: '五月最后一个星期一', tag: '美国节日', color: 'holiday' },
  { id: 'us-mothers-day', name: '母亲节', date: '2026-05-10', note: '五月第二个星期日 · 长辈礼赠节点', tag: '礼赠节日', color: 'holiday' },
  { id: 'us-fathers-day', name: '父亲节', date: '2026-06-21', note: '六月第三个星期日 · 长辈礼赠节点', tag: '礼赠节日', color: 'holiday' },
  { id: 'us-juneteenth', name: '六月节', date: '2026-06-19', note: '美国联邦节日', tag: '美国节日', color: 'holiday' },
  { id: 'us-independence-day', name: '美国独立日', date: '2026-07-04', note: '美国联邦节日', tag: '美国节日', color: 'holiday' },
  { id: 'us-labor-day', name: '劳动节', date: '2026-09-07', note: '九月第一个星期一', tag: '美国节日', color: 'holiday' },
  { id: 'us-grandparents-day', name: '祖父母节', date: '2026-09-13', note: '劳动节后的第一个星期日 · 长辈礼赠节点', tag: '礼赠节日', color: 'holiday' },
  { id: 'us-columbus-day', name: '哥伦布日 / 原住民日', date: '2026-10-12', note: '十月第二个星期一', tag: '美国节日', color: 'holiday' },
  { id: 'us-halloween', name: '万圣节', date: '2026-10-31', note: '美国主要节日', tag: '美国节日', color: 'holiday' },
  { id: 'us-veterans-day', name: '退伍军人节', date: '2026-11-11', note: '美国联邦节日', tag: '美国节日', color: 'holiday' },
  { id: 'us-thanksgiving', name: '感恩节', date: '2026-11-26', note: '十一月第四个星期四 · BFCM 购物季开始', tag: '购物节点', color: 'holiday' },
  { id: 'us-black-friday', name: '黑色星期五', date: '2026-11-27', note: '感恩节次日 · 年度重点购物日', tag: '购物节点', color: 'holiday' },
  { id: 'us-cyber-monday', name: '网络星期一', date: '2026-11-30', note: '感恩节后的星期一 · 线上购物节点', tag: '购物节点', color: 'holiday' },
  { id: 'us-christmas', name: '圣诞节', date: '2026-12-25', note: '冬季主要节日 · 长辈礼赠节点', tag: '礼赠节日', color: 'holiday' },
];

const seedEvents = [...demoEvents, ...defaultUsEvents];

const API_BASE = window.SUISHI_API_BASE || '';
let calendarToken = localStorage.getItem('suishi-calendar-token') || '';
let subscriptionUrl = localStorage.getItem('suishi-subscription-url') || '';

const state = {
  events: loadEvents(),
  activeView: 'overview',
  dateType: 'lunar',
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function loadEvents() {
  try {
    const saved = localStorage.getItem('suishi-events');
    if (!saved) return seedEvents;
    const events = JSON.parse(saved);
    const existingIds = new Set(events.map((event) => event.id));
    return [...events, ...defaultUsEvents.filter((event) => !existingIds.has(event.id))];
  } catch {
    return seedEvents;
  }
}

function persistEvents() {
  localStorage.setItem('suishi-events', JSON.stringify(state.events));
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
  return payload;
}

function updateSubscriptionUrl(url = subscriptionUrl) {
  subscriptionUrl = url;
  if (url) {
    localStorage.setItem('suishi-subscription-url', url);
    $('#subscription-url').textContent = url;
  } else {
    $('#subscription-url').textContent = '连接后生成订阅链接';
  }
}

function setConnectionStatus(label, connected = false) {
  const status = $('.sync-status');
  if (!status) return;
  status.innerHTML = `<span class="status-dot"></span>${label}`;
  status.classList.toggle('is-connected', connected);
}

async function ensureRemoteCalendar() {
  if (calendarToken && subscriptionUrl) return { token: calendarToken, subscriptionUrl };
  const payload = await apiRequest('/api/calendars', {
    method: 'POST',
    body: JSON.stringify({ name: '林予安的岁时日历' }),
  });
  calendarToken = payload.calendar.token;
  localStorage.setItem('suishi-calendar-token', calendarToken);
  updateSubscriptionUrl(payload.subscriptionUrl);
  setConnectionStatus('已连接', true);
  return { token: calendarToken, subscriptionUrl: payload.subscriptionUrl };
}

async function loadRemoteCalendar() {
  if (!calendarToken) return;
  try {
    const payload = await apiRequest(`/api/calendars/${calendarToken}/events`);
    state.events = payload.events.map((event) => ({ ...event, remoteId: event.id }));
    updateSubscriptionUrl(`${API_BASE}/api/calendar/${calendarToken}.ics`);
    setConnectionStatus('已连接', true);
    renderCalendar();
    renderUpcoming();
    renderEventListPage();
  } catch (error) {
    setConnectionStatus('本地预览');
    showToast(`Cloudflare 日历暂时无法连接：${error.message}`);
  }
}

async function syncEventToRemote(event) {
  const remote = await ensureRemoteCalendar();
  const payload = await apiRequest(`/api/calendars/${remote.token}/events`, {
    method: 'POST',
    body: JSON.stringify({
      name: event.name,
      dateType: event.dateType,
      date: event.date,
      month: event.month,
      day: event.day,
      note: event.note,
      tag: event.tag,
      color: event.color,
      repeatAnnual: event.repeatAnnual,
      annualRule: event.annualRule,
    }),
  });
  event.remoteId = payload.event.id;
  event.id = payload.event.id;
  event.date = payload.event.date;
  return payload.event;
}

function formatShortDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatWeekday(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return `周${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`;
}

function getMonthEvents(year, month) {
  return state.events.filter((event) => {
    if (!event.date) return false;
    const date = new Date(`${event.date}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function renderCalendar() {
  const grid = $('#calendar-grid');
  if (!grid) return;

  const year = 2026;
  const month = 8;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const events = getMonthEvents(year, month);
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstDay + 1;
    const isPrevious = dayNumber < 1;
    const isNext = dayNumber > daysInMonth;
    const visibleDay = isPrevious ? daysInPreviousMonth + dayNumber : isNext ? dayNumber - daysInMonth : dayNumber;
    const cellMonth = isPrevious ? month - 1 : isNext ? month + 1 : month;
    const cellYear = cellMonth < 0 ? year - 1 : cellMonth > 11 ? year + 1 : year;
    const normalizedMonth = (cellMonth + 12) % 12;
    const dateKey = `${cellYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(visibleDay).padStart(2, '0')}`;
    const cellEvents = events.filter((event) => event.date === dateKey);
    const isToday = dateKey === '2026-09-22';
    const lunarLabel = isToday ? '八月初十' : ['廿五', '廿六', '廿七', '廿八', '廿九', '初一', '初二'][visibleDay % 7];

    cells.push(`<div class="calendar-cell${isPrevious || isNext ? ' is-muted' : ''}${isToday ? ' is-today' : ''}"${isToday ? ' aria-current="date"' : ''}>
      <span class="date-number">${visibleDay}</span>
      <span class="lunar-label">${lunarLabel}</span>
      <div class="day-events">${cellEvents.map((event) => `<span class="day-event ${event.color || ''}">${event.name}</span>`).join('')}</div>
    </div>`);
  }

  grid.innerHTML = cells.join('');
}

function upcomingEvents() {
  return [...state.events]
    .filter((event) => event.date)
    .filter((event) => event.date >= '2026-09-22')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
}

function renderUpcoming() {
  const list = $('#upcoming-list');
  const count = $('#event-count');
  if (!list || !count) return;
  const events = upcomingEvents();
  count.textContent = `${state.events.length} 件`;
  list.innerHTML = events.map((event) => `
    <article class="upcoming-item">
      <div class="upcoming-date"><strong>${new Date(`${event.date}T12:00:00`).getDate()}</strong><span>${formatWeekday(event.date)}</span></div>
      <div class="upcoming-copy"><strong>${event.name}</strong><p>${event.note || (event.dateType === 'lunar' ? `农历${event.month}${event.day}` : formatShortDate(event.date))}</p><span class="event-tag ${event.color === 'holiday' ? 'green' : ''}">${event.tag || '纪念日'}</span></div>
    </article>`).join('');
}

function renderEventListPage() {
  const list = $('#event-list-page');
  if (!list) return;
  const events = [...state.events].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  list.innerHTML = events.map((event) => `
    <article class="event-list-row">
      <div class="event-list-date">${event.date ? `${event.date.replaceAll('-', ' / ')} · ${formatWeekday(event.date)}` : '尚未计算'}</div>
      <div><strong>${event.name}</strong><small>${event.note || (event.dateType === 'lunar' ? `农历${event.month}${event.day}` : '公历日期')}</small></div>
      <button class="delete-event" type="button" data-delete-event="${event.id}" aria-label="删除 ${event.name}">删除</button>
    </article>`).join('');
}

function setView(viewName) {
  state.activeView = viewName;
  $$('.nav-item').forEach((item) => item.classList.toggle('is-active', item.dataset.view === viewName));
  $$('[data-view-panel]').forEach((panel) => {
    const isCurrent = panel.dataset.viewPanel === viewName;
    panel.hidden = !isCurrent;
    panel.classList.toggle('is-visible', isCurrent);
  });
  $('#page-title').textContent = { overview: '日历总览', events: '添加日期', settings: '订阅设置' }[viewName];
  if (viewName === 'events') renderEventListPage();
}

function openModal() {
  $('#event-modal').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#event-name').focus(), 30);
}

function closeModal() {
  $('#event-modal').hidden = true;
  document.body.style.overflow = '';
  $('#event-form').reset();
  setDateType('lunar');
}

function setDateType(type) {
  state.dateType = type;
  $('[name="dateType"]').value = type;
  $$('.segment').forEach((segment) => segment.classList.toggle('is-active', segment.dataset.dateType === type));
  $('.lunar-fields').hidden = type !== 'lunar';
  $('.solar-fields').hidden = type !== 'solar';
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

async function copySubscriptionUrl() {
  let url = subscriptionUrl;
  try {
    if (!url) url = (await ensureRemoteCalendar()).subscriptionUrl;
  } catch (error) {
    showToast(`暂时无法生成订阅链接：${error.message}`);
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast('订阅链接已复制，可以粘贴到 iPhone 日历。');
  } catch {
    showToast('请长按订阅链接并复制。');
  }
}

$$('.nav-item').forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)));
$('#open-add-event').addEventListener('click', openModal);
$('#open-add-event-secondary').addEventListener('click', openModal);
$('#close-modal').addEventListener('click', closeModal);
$('#cancel-modal').addEventListener('click', closeModal);
$('#event-modal').addEventListener('click', (event) => { if (event.target === $('#event-modal')) closeModal(); });
$('#copy-url').addEventListener('click', copySubscriptionUrl);
$('#show-all-events').addEventListener('click', () => setView('events'));
$$('.segment').forEach((segment) => segment.addEventListener('click', () => setDateType(segment.dataset.dateType)));

$('#event-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const dateType = form.get('dateType');
  const solarDate = form.get('solarDate');
  const newEvent = {
    id: Date.now(),
    name: form.get('name'),
    dateType,
    month: form.get('month'),
    day: form.get('day'),
    date: dateType === 'solar' && solarDate ? solarDate : null,
    note: form.get('note'),
    tag: dateType === 'lunar' ? '农历生日' : '公历日期',
    color: 'birthday',
  };
  state.events.push(newEvent);
  persistEvents();
  renderCalendar();
  renderUpcoming();
  renderEventListPage();
  closeModal();
  try {
    await syncEventToRemote(newEvent);
    persistEvents();
    renderCalendar();
    renderUpcoming();
    renderEventListPage();
    showToast('日期已保存，并已加入 Cloudflare 日历。');
  } catch (error) {
    showToast(`日期已保存在本地，远程同步失败：${error.message}`);
  }
});

document.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('[data-delete-event]');
  if (!deleteButton) return;
  const id = deleteButton.dataset.deleteEvent;
  const target = state.events.find((item) => String(item.id) === id);
  if (target?.remoteId && calendarToken) {
    try {
      await apiRequest(`/api/calendars/${calendarToken}/events/${target.remoteId}`, { method: 'DELETE' });
    } catch (error) {
      showToast(`远程日期删除失败：${error.message}`);
      return;
    }
  }
  state.events = state.events.filter((item) => String(item.id) !== id);
  persistEvents();
  renderCalendar();
  renderUpcoming();
  renderEventListPage();
  showToast(`${target?.name || '日期'}已删除。`);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('#event-modal').hidden) closeModal();
});

renderCalendar();
renderUpcoming();
renderEventListPage();
updateSubscriptionUrl();
loadRemoteCalendar();
