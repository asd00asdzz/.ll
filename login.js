import crypto from 'node:crypto';
import { SCOPES, redirectUri, cookie } from '../_tiktok.js';

export default function handler(req, res) {
  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET || !process.env.TIKTOK_SESSION_SECRET) {
    res.status(500).send('ยังไม่ได้ตั้งค่า TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_SESSION_SECRET ใน Vercel');
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  const url = 'https://www.tiktok.com/v2/auth/authorize/?' + new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    scope: SCOPES,
    response_type: 'code',
    redirect_uri: redirectUri(req),
    state
  });
  res.setHeader('Set-Cookie', cookie('tt_state', state, 600));
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, url);
}
