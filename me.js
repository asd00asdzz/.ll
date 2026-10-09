import { seal, unseal, getCookie, cookie, tokenCall } from '../_tiktok.js';

const API = 'https://open.tiktokapis.com/v2';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let s = unseal(getCookie(req, 'tt_session'));
  if (!s) return res.status(200).json({ connected: false });

  if (Date.now() > s.exp - 60000) {
    const t = await tokenCall({ grant_type: 'refresh_token', refresh_token: s.rt });
    if (!t.access_token) {
      res.setHeader('Set-Cookie', cookie('tt_session', '', 0));
      return res.status(200).json({ connected: false });
    }
    s = { at: t.access_token, rt: t.refresh_token || s.rt, exp: Date.now() + (t.expires_in || 86400) * 1000 };
    res.setHeader('Set-Cookie', cookie('tt_session', seal(s), 60 * 60 * 24 * 30));
  }

  const h = { Authorization: `Bearer ${s.at}` };
  const [u, v] = await Promise.all([
    fetch(`${API}/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count`, { headers: h }).then(r => r.json()),
    fetch(`${API}/video/list/?fields=id,title,cover_image_url,share_url,create_time,view_count,like_count,comment_count,share_count`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_count: 20 })
    }).then(r => r.json())
  ]);

  res.status(200).json({
    connected: true,
    user: u?.data?.user || null,
    videos: v?.data?.videos || [],
    errors: { user: u?.error?.code !== 'ok' ? u?.error : null, videos: v?.error?.code !== 'ok' ? v?.error : null }
  });
}
