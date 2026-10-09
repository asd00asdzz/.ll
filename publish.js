import { seal, unseal, getCookie, cookie, tokenCall } from '../_tiktok.js';

const API = 'https://open.tiktokapis.com/v2';
const PRIV = { public: 'PUBLIC_TO_EVERYONE', friends: 'MUTUAL_FOLLOW_FRIENDS', private: 'SELF_ONLY' };

async function session(req, res) {
  let s = unseal(getCookie(req, 'tt_session'));
  if (!s) return null;
  if (Date.now() > s.exp - 60000) {
    const t = await tokenCall({ grant_type: 'refresh_token', refresh_token: s.rt });
    if (!t.access_token) return null;
    s = { at: t.access_token, rt: t.refresh_token || s.rt, exp: Date.now() + (t.expires_in || 86400) * 1000 };
    res.setHeader('Set-Cookie', cookie('tt_session', seal(s), 60 * 60 * 24 * 30));
  }
  return s;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const s = await session(req, res);
  if (!s) return res.status(401).json({ error: 'not_connected' });
  const h = { Authorization: `Bearer ${s.at}`, 'Content-Type': 'application/json; charset=UTF-8' };

  if (req.method === 'GET') {
    const id = String(req.query.publish_id || '');
    const r = await fetch(`${API}/post/publish/status/fetch/`, { method: 'POST', headers: h, body: JSON.stringify({ publish_id: id }) });
    return res.status(200).json(await r.json());
  }
  if (req.method !== 'POST') return res.status(405).end();

  const { title = '', size, privacy = 'private' } = req.body || {};
  if (!Number.isInteger(size) || size <= 0 || size > 1_000_000_000) return res.status(400).json({ error: 'bad_size' });
  const chunk = Math.min(size, 64 * 1024 * 1024);
  const r = await fetch(`${API}/post/publish/video/init/`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      post_info: { title: String(title).slice(0, 2200), privacy_level: PRIV[privacy] || PRIV.private },
      source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunk, total_chunk_count: Math.ceil(size / chunk) }
    })
  });
  res.status(200).json({ ...(await r.json()), chunk });
}
