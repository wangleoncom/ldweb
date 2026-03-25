export function requireAuth(app, callback) {
  const user = app.getCurrentUser();
  if (!user) {
    app.openAuthModal('login');
    app.showToast('請先登入會員。', 'info');
    return false;
  }
  if (typeof callback === 'function') callback(user);
  return true;
}
