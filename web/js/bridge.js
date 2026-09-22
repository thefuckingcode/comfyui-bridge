import { app } from "../../../scripts/app.js";

// ComfyUI-Gallery bridge: 图库点「打开 ComfyUI」携带 ?comfygal=source:rel，
// 启动时自动从图库拉取该工作流并 loadGraphData 加载到画布。
const GALLERY = "http://localhost:8765"; // 改成你的图库服务地址

let _pending = null;

app.registerExtension({
  name: "comfygal.Bridge",
  setup() {
    console.log("[comfygal-bridge] v3 (rename-retry) setup");
    const params = new URLSearchParams(window.location.search);
    const q = params.get("comfygal");
    if (q) {
      const sep = q.indexOf(":");
      if (sep > 0) {
        _pending = {
          source: q.slice(0, sep),
          rel: q.slice(sep + 1),
        };
      }
      const url = new URL(window.location);
      url.searchParams.delete("comfygal");
      try { history.replaceState({}, "", url.pathname + url.search); } catch (e) {}
    }
    if (!_pending) {
      const h = window.location.hash || "";
      if (h.indexOf("comfygal:") === 1) {
        const raw = h.slice(1 + "comfygal:".length);
        const sep = raw.indexOf(":");
        if (sep > 0) {
          _pending = {
            source: raw.slice(0, sep),
            rel: decodeURIComponent(raw.slice(sep + 1)),
          };
        }
        try { history.replaceState({}, "", location.pathname); } catch (e) {}
      }
    }
    if (_pending) setTimeout(loadWorkflow, 400);
  },
});

function loadWorkflow() {
  if (!_pending) return;
  const { source, rel } = _pending;
  _pending = null;

  fetch(GALLERY + "/api/workflow_file?source=" + encodeURIComponent(source) + "&rel=" + encodeURIComponent(rel), { cache: "no-store" })
    .then(r => r.text())
    .then(text => {
      let data;
      try { data = JSON.parse(text); } catch (e) { data = null; }
      if (!data || (Object.prototype.hasOwnProperty.call(data, "ok") && data.ok === false)) {
        console.error("[comfygal-bridge] workflow fetch failed:", text.slice(0, 300));
        return;
      }
      app.loadGraphData(data, { applyZoomTransform: false });
      const name = (String(rel).split(/[\\/]/).pop() || rel).replace(/\.[^.]+$/, "").trim() || "workflow";
      // 新版 ComfyUI 顶部工作流标签名来自 workflow store 的 activeWorkflow,
      // 通过 pinia 的 renameWorkflow 把它改成当前工作流名称
      renameActiveTabTo(name);
      console.log("[comfygal-bridge] loaded workflow:", name, source, rel);
    })
    .catch(e => console.error("[comfygal-bridge] fetch error:", e));
}

// 把 ComfyUI 顶栏当前活动工作流标签改名为指定名称。
// 页面加载早期 ComfyUI 会异步恢复会话（切换/新建 activeWorkflow），
// 必须等 activeWorkflow 连续两次轮询为同一对象（已稳定）再改，否则会被会话恢复覆盖。
function renameActiveTabTo(title) {
  let tries = 0;
  const MAX = 40;
  let lastWf = null;
  let lastWfAt = 0;
  const ping = () => {
    try {
      // app.extensionManager.workflow 暴露 Pinia 的 workflow store（注入脚本里
      // window.app.$pinia 常取不到，用它更稳；参照 ComfyUI-PromptChain）。
      let store = null;
      try { store = (app && app.extensionManager && app.extensionManager.workflow) || null; } catch (e) {}
      if (!store) {
        try {
          const pinia = (window.app && window.app.$pinia) || window.$pinia;
          store = pinia && pinia._s && (pinia._s.get ? pinia._s.get("workflow") : pinia._s["workflow"]);
        } catch (e) {}
      }
      const wf = store && store.activeWorkflow;
      const now = Date.now();
      if (store && wf && typeof store.renameWorkflow === "function") {
        if (wf === lastWf && now - lastWfAt >= 500) {
          // renameWorkflow 第二参是完整 store 路径（ComfyWorkflow.basePath='workflows/'）。
          // ComfyUI 的 /userdata/workflows/... 已映射到用户工作流目录，
          // 必须带 workflows/ 基路径 + .json，否则保存会落 userdata 根目录报 403。
          const safe = String(title).replace(/[\\/]/g, "_").replace(/\.json$/i, "").trim() || "workflow";
          store.renameWorkflow(wf, "workflows/" + safe + ".json");
          console.log("[comfygal-bridge] renamed active tab to:", title, "->", "workflows/" + safe + ".json");
          return;
        }
        if (wf !== lastWf) { lastWf = wf; lastWfAt = now; }
        setTimeout(ping, 500);
        return;
      }
      lastWf = null;
      if (tries++ < MAX) setTimeout(ping, 500);
      else console.warn("[comfygal-bridge] rename tab: workflow store not ready, give up");
    } catch (e) {
      if (tries++ < MAX) setTimeout(ping, 500);
      else console.warn("[comfygal-bridge] rename tab failed:", e);
    }
  };
  ping();
}
