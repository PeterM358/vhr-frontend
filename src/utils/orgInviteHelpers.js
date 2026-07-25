export function resolveInviteTokenFromRoute(route, pathname = '') {
  const params = route?.params || {};
  let { token } = params;
  if ((!token || token === 'undefined') && pathname) {
    const match = String(pathname).match(/organization-invite\/([^/?#]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }
  return (token || '').trim();
}

export function inviteReturnPath(token) {
  return `/organization-invite/${encodeURIComponent(token)}`;
}

export function localizeOrgMembershipRole(t, roleCode) {
  const code = String(roleCode || '').trim().toLowerCase();
  if (!code) return '';
  const key = `orgInvite.roles.${code}`;
  const label = t(key);
  return label === key ? code : label;
}
