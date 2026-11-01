// Cino Merge · 合成小瑞瑞 · 在线功能配置
// 线上通过自己网站的 /sb 转发到 Supabase（国内直连 supabase.co 经常失败）；
// 本地直接打开文件时没有转发，就直连 Supabase。
// publishable key 是公开的，可以放在网页里；secret / service_role key 千万不要填在这里。
(function () {
  var direct = "https://bhpesigpenrxtnmvyflt.supabase.co";
  var viaSite = /^https:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  window.XXR_CONFIG = {
    url: viaSite ? location.origin + "/sb" : direct,
    anonKey: "sb_publishable_Brh40DDnGwOJFyS3zVNjZw_JkNKEMAF",
  };
})();
