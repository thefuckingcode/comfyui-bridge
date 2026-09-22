# comfyui-bridge

ComfyUI 自定义节点扩展，用于把「ComfyUI 图库」（Gallery）里的工作流一键加载到 ComfyUI 画布。

- 图库点击「打开 ComfyUI」时，浏览器打开 ComfyUI 并附带 `?comfygal=source:rel` 查询参数。
- 本插件的前端扩展（`web/js/bridge.js`）在页面启动时解析该参数，向后端 `/api/workflow_file` 拉取工作流 JSON，调用 `app.loadGraphData` 载入画布，并把顶部工作流标签改名为对应文件名。

## 安装

1. 将本目录复制到 ComfyUI 的 `custom_nodes/` 下（目录名任意，例如 `comfyui-bridge`）。
2. 重启 ComfyUI。

`__init__.py` 里注册的是一个**占位节点** `ComfyGalBridge`（`nop` 仅返回 `"ok"`），不参与实际运算，只负责让 ComfyUI 加载本插件的 web 前端扩展。真正的加载逻辑全在 `web/js/bridge.js`。

## 配置

编辑 `web/js/bridge.js` 顶部的 `GALLERY` 常量，改为你的图库服务地址：

```js
const GALLERY = "http://localhost:8765"; // 改成你的图库服务地址
```

## 使用

图库点击「打开 ComfyUI」会自动携带 `?comfygal=source:rel` 参数：

- `source`：工作流来源，取值 `comfyui`（ComfyUI 工作流目录）或 `app`（AI 应用目录）。
- `rel`：相对该来源目录的工作流文件相对路径（如 `workflows/xxx.json`）。

后端 `/api/workflow_file?source=...&rel=...` 返回该工作流的 JSON 原文（并注入 `title` 字段、带 CORS 头），前端扩展据此加载。

## 文件结构

```
comfyui-bridge/
├── __init__.py        # 占位节点注册，声明 WEB_DIRECTORY
└── web/
    └── js/
        └── bridge.js  # 解析 ?comfygal= 参数并加载工作流
```