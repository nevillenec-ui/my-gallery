const PUBLIC_BASE = 'https://pub-a6729548ecbb4123a0c9ca9726e9e66f.r2.dev';
const IMG_RE = /\.(png|jpe?g|gif|webp|avif)$/i;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function toUrl(key) {
  return `${PUBLIC_BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function onRequestGet(context) {
  try {
    if (!context.env.festival) {
      return json({ error: 'R2 binding festival is not configured' }, 500);
    }

    const url = new URL(context.request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit'), 10) || 24, 100);
    const cursor = url.searchParams.get('cursor') || undefined;
    const prefix = url.searchParams.get('prefix') || '';

    const list = await context.env.festival.list({
      limit,
      cursor,
      prefix,
      delimiter: '/',
    });

    const images = list.objects
      .filter(o => !o.key.endsWith('/') && IMG_RE.test(o.key))
      .map(o => ({
        key: o.key,
        size: o.size,
        uploaded: o.uploaded,
        url: toUrl(o.key),
      }));

    // 为每个子目录取一张封面（目录里的第一张图片）
    const prefixes = await Promise.all(
      (list.delimitedPrefixes || []).map(async p => {
        const sub = await context.env.festival.list({ prefix: p, limit: 10 });
        const coverObj = sub.objects.find(o => !o.key.endsWith('/') && IMG_RE.test(o.key));
        return {
          prefix: p,
          name: p.replace(/\/$/, '').split('/').pop(),
          cover: coverObj ? toUrl(coverObj.key) : null,
        };
      })
    );

    return json({
      prefixes,
      images,
      truncated: list.truncated,
      cursor: list.truncated ? list.cursor : null,
    });
  } catch (err) {
    return json({ error: String((err && err.message) || err) }, 500);
  }
}
