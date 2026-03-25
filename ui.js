export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function formatDateDisplay(value) {
  if (!value) return '-';
  try {
    if (typeof value?.toDate === 'function') return value.toDate().toLocaleString('zh-TW');
    return new Date(value).toLocaleString('zh-TW');
  } catch {
    return String(value);
  }
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
