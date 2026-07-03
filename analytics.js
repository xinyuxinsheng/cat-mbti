// ============================================================
// 猫咪MBTI · 埋点（本地聚合 + 可插拔上报）
// ============================================================

const ANALYTICS_CONFIG = {
  // 百度统计站点 ID（注册 tongji.baidu.com 后把 ID 填这里即自动启用）
  baiduId: '',
  // 可选：自建收集端点（POST JSON），留空则只做本地聚合
  endpoint: '',
};

(function initBaidu() {
  if (!ANALYTICS_CONFIG.baiduId) return;
  window._hmt = window._hmt || [];
  const hm = document.createElement('script');
  hm.src = 'https://hm.baidu.com/hm.js?' + ANALYTICS_CONFIG.baiduId;
  document.head.appendChild(hm);
})();

function track(event, label) {
  try {
    // 1) 本地聚合（控制台输入 __stats() 查看漏斗计数）
    const key = 'mbti_stats';
    const stats = JSON.parse(localStorage.getItem(key) || '{}');
    stats[event] = (stats[event] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(stats));
    // 2) 百度统计事件
    if (window._hmt) _hmt.push(['_trackEvent', 'cat-mbti', event, String(label || '')]);
    // 3) 自定义端点
    if (ANALYTICS_CONFIG.endpoint && navigator.sendBeacon) {
      navigator.sendBeacon(ANALYTICS_CONFIG.endpoint, JSON.stringify({ event, label, t: Date.now() }));
    }
  } catch (e) { /* 埋点失败不影响主流程 */ }
}

window.__stats = () => JSON.parse(localStorage.getItem('mbti_stats') || '{}');
