// ================= 复制从这里开始 =================
export async function onRequestGet({ request, env }) {
  // 1. 获取前端传过来的分页参数 (limit 和 cursor)
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 24, 100);
  const cursor = url.searchParams.get("cursor") || undefined;

  // 2. 尝试从 R2 桶里分页获取数据
  let listed;
  try {
    listed = await env.IMG_BUCKET.list({
      limit: limit,
      cursor: cursor,
    });
  } catch (err) {
    return new Response(`R2 List Error: ${err.message}`, { status: 500 });
  }

  // 3. 过滤出图片文件，并生成正确的公共访问链接
  const images = listed.objects
    .filter((o) => /\.(jpg|jpeg|png|gif|webp)$/i.test(o.key))
    .map((o) => ({
      key: o.key,
      url: `https://pub-b994451de7e14631b2da3e507d4f557e.r2.dev/${encodeURIComponent(o.key)}`,
    }));

  // 4. 返回标准的 JSON 分页数据
  return Response.json({
    images: images,
    truncated: listed.truncated, // 是否还有下一页
    cursor: listed.truncated ? listed.cursor : undefined, // 下一页的游标
  });
}
// ================= 复制到这里结束 =================
