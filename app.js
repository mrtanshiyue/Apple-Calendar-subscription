const seedEvents = [
  { id: 1, name: '妈妈生日', dateType: 'lunar', month: '八月', day: '初八', date: '2026-09-19', note: '记得提前订花', tag: '农历生日', color: 'birthday' },
  { id: 2, name: '国庆节', dateType: 'holiday', month: '', day: '', date: '2026-10-01', note: '放假 7 天 · 10 月 10 日补班', tag: '法定节假日', color: 'holiday' },
  { id: 3, name: '外婆生日', dateType: 'lunar', month: '九月', day: '廿三', date: '2026-11-03', note: '农历九月廿三', tag: '农历生日', color: 'birthday' },
];

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
    return saved ? JSON.parse(saved) : seedEvents;
  } catch {
    return seedEvents;
  }
}

function persistEvents() {
  localStorage.setItem('suishi-events', JSON.stringify(state.events));
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
  const url = $('#subscription-url').textContent;
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

$('#event-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const dateType = form.get('dateType');
  const solarDate = form.get('solarDate');
  const eventDate = dateType === 'solar' && solarDate ? solarDate : '2027-01-15';
  state.events.push({
    id: Date.now(),
    name: form.get('name'),
    dateType,
    month: form.get('month'),
    day: form.get('day'),
    date: eventDate,
    note: form.get('note'),
    tag: dateType === 'lunar' ? '农历生日' : '公历日期',
    color: 'birthday',
  });
  persistEvents();
  renderCalendar();
  renderUpcoming();
  renderEventListPage();
  closeModal();
  showToast('日期已保存。接入后端后会自动加入订阅日历。');
});

document.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-delete-event]');
  if (!deleteButton) return;
  const id = Number(deleteButton.dataset.deleteEvent);
  const target = state.events.find((item) => item.id === id);
  state.events = state.events.filter((item) => item.id !== id);
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
