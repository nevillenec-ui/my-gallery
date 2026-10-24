export async function onRequestGet({ request, env }) {
  // 1. 获取前端传来的分页参数 (limit 和 cursor)
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 24, 100);
  const cursor = url.searchParams.get("cursor") || undefined;

  // 2. 尝试从 R2 桶里分页拉取数据
  let listed;
  try {
    listed = await env.IMG_BUCKET.list({
      limit: limit,
      cursor: cursor,
    });
  } catch (err) {
    return new Response(`R2 List Error: ${err.message}`, { status: 500 });
  }

  // 3. 过滤出图片文件，并生成正确的公网访问链接
  const images = listed.objects
    .filter((o) => /\.(png|jpg|jpeg|gif|webp|avif|svg)$/i.test(o.key)) // 排除掉不是图片的文件
    .map((o) => ({
      key: o.key, // 保留完整路径，例如 "Animal mask/40002.webp"
      // 注意：这里不再拼接完整的 o.key，而是直接用相对路径
      url: `https://pub-b994451de7e14631b2da3e507df4557e.r2.dev/${encodeURIComponent(o.key)}`, 
    }));

  // 4. 返回标准的 JSON 分页数据
  return Response.json({
    images: images,
    truncated: listed.truncated, // 是否还有下一页
    cursor: listed.truncated ? listed.cursor : null, // 下一页的锚点
  });
}
