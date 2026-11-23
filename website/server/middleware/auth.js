const { HttpError, asyncRoute } = require('../lib/errors');

function authMiddleware(supabase) {
  const resolveUser = async (req, required) => {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      if (required) throw new HttpError(401, 'Authentication is required.', 'unauthorized');
      return null;
    }
    if (!supabase) throw new HttpError(503, 'Authentication service is not configured.', 'service_unavailable');
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data.user) throw new HttpError(401, 'Your session is invalid or expired.', 'unauthorized');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    if (profileError || !profile) throw new HttpError(403, 'No Connect profile is associated with this account.', 'profile_missing');
    req.user = data.user;
    req.profile = profile;
    req.accessToken = match[1];
    return data.user;
  };

  const optionalAuth = asyncRoute(async (req, _res, next) => { await resolveUser(req, false); next(); });
  const requireAuth = asyncRoute(async (req, _res, next) => { await resolveUser(req, true); next(); });
  const requireRole = (...roles) => (req, _res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) return next(new HttpError(403, 'You do not have permission to perform this action.', 'forbidden'));
    next();
  };
  return { optionalAuth, requireAuth, requireRole };
}

module.exports = { authMiddleware };
