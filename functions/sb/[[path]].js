// Cloudflare Pages Function：把 /sb/* 转发到 Supabase。
// 国内有时连不上 supabase.co，这样浏览器只需要连自己的网站（cino-merge.pages.dev），
// 由 Cloudflare 在海外替它去连 Supabase。实时推送（WebSocket）也一并转发。
const SUPABASE = "https://bhpesigpenrxtnmvyflt.supabase.co";

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const target = SUPABASE + url.pathname.replace(/^\/sb/, "") + url.search;

  // 公开头像图片：在 Cloudflare 边缘缓存一年（图片地址带版本号，换头像会换地址），省 Supabase 流量
  if (request.method === "GET" && url.pathname.startsWith("/sb/storage/v1/object/public/")) {
    return fetch(target, { cf: { cacheEverything: true, cacheTtl: 31536000 } });
  }

  // 其余请求（数据库、登录、实时推送）原样转发
  return fetch(new Request(target, request));
}
