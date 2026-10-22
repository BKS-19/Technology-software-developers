const metricsContainer = document.getElementById('metrics');
const rowsContainer = document.getElementById('activity-rows');
const rowsCount = document.getElementById('rows-count');
const rowsEmpty = document.getElementById('rows-empty');
const notificationsList = document.getElementById('notifications-list');
const notificationsEmpty = document.getElementById('notifications-empty');
const loading = document.getElementById('loading');
const loadError = document.getElementById('load-error');
const loadErrorMessage = document.getElementById('load-error-message');
const retryButton = document.getElementById('retry-load');
const metricTemplate = document.getElementById('metric-template');
const statusClasses = {
  'Новая': 'text-bg-primary',
  'В работе': 'text-bg-warning',
  'Готово': 'text-bg-success'
};
const notificationClasses = {
  success: 'text-success',
  warning: 'text-warning-emphasis',
  info: 'text-primary',
  danger: 'text-danger'
};

let rows = [];
let notifications = [];

async function readJSON(file) {
  const response = await fetch(file);

  if (!response.ok) {
    throw new Error('Не удалось загрузить данные панели. Попробуйте ещё раз.');
  }

  return response.json();
}

function validateData(dashboard, messages) {
  const validMetrics = Array.isArray(dashboard.metrics) && dashboard.metrics.length >= 4 &&
    dashboard.metrics.every(metric => typeof metric.title === 'string' && metric.title.trim() &&
      ((typeof metric.value === 'number' && Number.isFinite(metric.value)) ||
        (typeof metric.value === 'string' && metric.value.trim())));
  const validRows = Array.isArray(dashboard.rows) && dashboard.rows.every(row =>
    Number.isInteger(row.id) && row.id > 0 && typeof row.action === 'string' &&
    row.action.trim() && Object.hasOwn(statusClasses, row.status));
  const uniqueIds = validRows && new Set(dashboard.rows.map(row => row.id)).size === dashboard.rows.length;
  const validMessages = Array.isArray(messages) && messages.every(message =>
    Object.hasOwn(notificationClasses, message.type) &&
    typeof message.text === 'string' && message.text.trim());

  if (!validMetrics || !validRows || !uniqueIds || !validMessages) {
    throw new Error('Формат данных панели некорректен. Проверьте исходные JSON-файлы.');
  }
}

function renderMetrics(metrics) {
  metricsContainer.replaceChildren();

  for (const metric of metrics) {
    const item = metricTemplate.content.cloneNode(true);
    item.querySelector('[data-metric-title]').textContent = metric.title;
    item.querySelector('[data-metric-value]').textContent = metric.value;
    metricsContainer.append(item);
  }
}

function renderRows() {
  rowsContainer.replaceChildren();

  for (const row of rows) {
    const item = document.createElement('tr');
    item.dataset.id = row.id;
    const id = document.createElement('th');
    id.scope = 'row';
    id.textContent = row.id;
    const action = document.createElement('td');
    action.textContent = row.action;
    const status = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${statusClasses[row.status]}`;
    badge.textContent = row.status;
    status.append(badge);
    const email = document.createElement('td');
    email.textContent = row.email || '—';
    item.append(id, action, status, email);
    rowsContainer.append(item);
  }

  rowsCount.textContent = `Показано: ${rows.length} из ${rows.length}`;
  rowsEmpty.hidden = rows.length > 0;
}

function renderNotifications() {
  notificationsList.replaceChildren();

  for (const notification of notifications) {
    const item = document.createElement('li');
    item.className = `list-group-item px-0 ${notificationClasses[notification.type]}`;
    item.textContent = notification.text;
    notificationsList.append(item);
  }

  notificationsEmpty.hidden = notifications.length > 0;
}

async function loadData() {
  loading.hidden = false;
  loadError.hidden = true;
  retryButton.disabled = true;

  try {
    if (!window.bootstrap) {
      throw new Error('Не удалось загрузить Bootstrap. Проверьте подключение к интернету и обновите страницу.');
    }

    const [dashboard, messages] = await Promise.all([
      readJSON('data/dashboard.json'),
      readJSON('data/notifications.json')
    ]);
    validateData(dashboard, messages);
    rows = dashboard.rows.map(row => ({ ...row }));
    notifications = messages;
    renderMetrics(dashboard.metrics);
    renderRows();
    renderNotifications();
  } catch (error) {
    metricsContainer.replaceChildren();
    rowsContainer.replaceChildren();
    notificationsList.replaceChildren();
    rowsEmpty.hidden = true;
    notificationsEmpty.hidden = true;
    loadErrorMessage.textContent = error instanceof SyntaxError
      ? 'Не удалось прочитать JSON. Проверьте формат исходных данных.'
      : error.message;
    loadError.hidden = false;
  } finally {
    loading.hidden = true;
    retryButton.disabled = false;
  }
}

retryButton.addEventListener('click', loadData);
loadData();
