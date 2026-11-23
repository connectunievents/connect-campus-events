/*
  Connect access rules shared by the static pages.
  The public (anon) key is safe in the browser. Authorization must still be
  enforced by Supabase RLS; see ../supabase/student-access.sql.
*/
(function () {
  const SUPABASE_URL = 'https://zzkmvoxguxwwiarmyusq.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_fJTo7h740aOw-l-fCsGN-Q_bhgj_l0a';
  const UNIVERSITY_DOMAINS = ['lau.edu.lb', 'students.lau.edu.lb', 'aub.edu.lb', 'mail.aub.edu', 'ndu.edu.lb', 'students.ndu.edu.lb'];
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const API_BASE = window.CONNECT_API_URL || ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port && location.port !== '3000' ? 'http://localhost:3000' : '');

  function isUniversityEmail(email) {
    const domain = String(email || '').trim().toLowerCase().split('@').pop();
    return UNIVERSITY_DOMAINS.includes(domain);
  }

  function isVerifiedStudent(user) {
    return Boolean(user && user.email_confirmed_at && isUniversityEmail(user.email));
  }

  async function getUser() {
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user;
  }

  async function api(path, options = {}) {
    const { data: { session } } = await client.auth.getSession();
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
    let response;
    try { response = await fetch(`${API_BASE}${path}`, { ...options, headers }); }
    catch { throw Object.assign(new Error('Cannot reach the Connect server. Check that it is running.'), { status: 0, code: 'network_error' }); }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) await client.auth.signOut();
      throw Object.assign(new Error(body.error?.message || 'The request could not be completed.'), { status: response.status, code: body.error?.code, details: body.error?.details });
    }
    return body;
  }

  function loginUrl() {
    return `login.html?next=${encodeURIComponent(window.location.href)}`;
  }

  async function updateStudentNavigation() {
    const user = await getUser();
    if (!isVerifiedStudent(user)) return null;

    document.querySelectorAll('[data-student-only]').forEach((element) => {
      element.hidden = false;
    });
    return user;
  }

  async function requireStudent() {
    const user = await updateStudentNavigation();
    if (user) return user;
    window.location.replace(loginUrl());
    return null;
  }

  function redirectAfterLogin() {
    const requested = new URLSearchParams(window.location.search).get('next');
    if (!requested) return 'explore-events.html';

    try {
      const target = new URL(requested, window.location.origin);
      return target.origin === window.location.origin ? target.href : 'explore-events.html';
    } catch {
      return 'explore-events.html';
    }
  }

  window.ConnectAccess = {
    client,
    universityDomains: UNIVERSITY_DOMAINS,
    isUniversityEmail,
    isVerifiedStudent,
    getUser,
    api,
    apiBase: API_BASE,
    updateStudentNavigation,
    requireStudent,
    redirectAfterLogin
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateStudentNavigation);
  } else {
    updateStudentNavigation();
  }
})();
