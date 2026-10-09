import { redirectUri, seal, getCookie, cookie, tokenCall } from '../_tiktok.js';

export default async function handler(req, res) {
  const { code, state, error } = req.query;
  res.setHeader('Cache-Control', 'no-store');
  if (error) return res.redirect(302, '/#tiktok');
  if (!code || !state || state !== getCookie(req, 'tt_state')) {
    return res.status(400).send('state ไม่ถูกต้อง ลองเชื่อมต่อใหม่');
  }
  const t = await tokenCall({
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(req)
  });
  if (!t.access_token) {
    return res.status(400).send('แลก token ไม่สำเร็จ: ' + (t.error_description || t.error || 'unknown'));
  }
  const session = seal({
    at: t.access_token,
    rt: t.refresh_token,
    exp: Date.now() + (t.expires_in || 86400) * 1000
  });
  res.setHeader('Set-Cookie', [
    cookie('tt_session', session, 60 * 60 * 24 * 30),
    cookie('tt_state', '', 0)
  ]);
  res.redirect(302, '/#tiktok');
}
