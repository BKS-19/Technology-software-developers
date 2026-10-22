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
const addButton = document.getElementById('add-record');
const modalElement = document.getElementById('record-modal');
const form = document.getElementById('record-form');
const actionInput = document.getElementById('record-action');
const emailInput = document.getElementById('record-email');
const statusInput = document.getElementById('record-status');
const formError = document.getElementById('form-error');
const toastElement = document.getElementById('notification-toast');
const toastTitle = document.getElementById('toast-title');
const toastMessage = document.getElementById('toast-message');
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
let dataReady = false;

async function readJSON(file) {
  const response = await fetch(file);

  if (!response.ok) {
    throw new Error('Не удалось загрузить данные панели. Попробуйте ещё раз.');
  }

  return response.json();
}

function validateData(dashboard, messages) {
  const validMetrics = dashboard && Array.isArray(dashboard.metrics) && dashboard.metrics.length >= 4 &&
    dashboard.metrics.every(metric => metric && typeof metric.title === 'string' && metric.title.trim() &&
      ((typeof metric.value === 'number' && Number.isFinite(metric.value)) ||
        (typeof metric.value === 'string' && metric.value.trim())));
  const validRows = dashboard && Array.isArray(dashboard.rows) && dashboard.rows.every(row =>
    row && Number.isInteger(row.id) && row.id > 0 && typeof row.action === 'string' &&
    row.action.trim() && Object.hasOwn(statusClasses, row.status));
  const uniqueIds = validRows && new Set(dashboard.rows.map(row => row.id)).size === dashboard.rows.length;
  const validMessages = Array.isArray(messages) && messages.every(message =>
    message && Object.hasOwn(notificationClasses, message.type) &&
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
    item.className = 'list-group-item px-0';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-link p-0 text-start text-decoration-none ${notificationClasses[notification.type]}`;
    button.textContent = notification.text;
    button.addEventListener('click', () => showNotification(notification.type));
    item.append(button);
    notificationsList.append(item);
  }

  notificationsEmpty.hidden = notifications.length > 0;
}

async function loadData() {
  dataReady = false;
  addButton.disabled = true;
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
    dataReady = true;
    addButton.disabled = false;
  } catch (error) {
    rows = [];
    notifications = [];
    metricsContainer.replaceChildren();
    rowsContainer.replaceChildren();
    notificationsList.replaceChildren();
    rowsCount.textContent = 'Показано: 0 из 0';
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

function showNotification(type) {
  const notification = notifications.find(message => message.type === type);

  if (!notification || !window.bootstrap) return;

  toastTitle.textContent = type === 'success' ? 'Готово' : 'Внимание';
  toastTitle.className = `me-auto ${notificationClasses[type]}`;
  toastMessage.textContent = notification.text;
  bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 4000 }).show();
}

function validateField(field) {
  if (field === actionInput) {
    const length = field.value.trim().length;
    field.setCustomValidity(length >= 3 && length <= 80 ? '' : 'Введите название операции.');
  }

  if (field === emailInput) {
    field.value = field.value.trim();
  }

  const valid = field.checkValidity();
  field.classList.toggle('is-invalid', !valid);
  field.classList.toggle('is-valid', valid);
  field.setAttribute('aria-invalid', String(!valid));
  return valid;
}

form.addEventListener('input', event => {
  if (event.target.matches('input, select')) {
    validateField(event.target);
    formError.hidden = true;
  }
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!dataReady) return;

  const fields = [actionInput, emailInput, statusInput];
  const results = fields.map(validateField);

  if (results.includes(false)) {
    formError.textContent = notifications.find(message => message.type === 'warning')?.text || 'Проверьте поля формы.';
    formError.hidden = false;
    fields[results.indexOf(false)].focus();
    showNotification('warning');
    return;
  }

  const id = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  rows.unshift({
    id,
    action: actionInput.value.trim(),
    status: statusInput.value,
    email: emailInput.value
  });
  renderRows();
  bootstrap.Modal.getOrCreateInstance(modalElement).hide();
  showNotification('success');
});

modalElement.addEventListener('shown.bs.modal', () => actionInput.focus());

modalElement.addEventListener('hidden.bs.modal', () => {
  form.reset();
  formError.hidden = true;

  for (const field of [actionInput, emailInput, statusInput]) {
    field.setCustomValidity('');
    field.classList.remove('is-valid', 'is-invalid');
    field.removeAttribute('aria-invalid');
  }
});

retryButton.addEventListener('click', loadData);
loadData();
