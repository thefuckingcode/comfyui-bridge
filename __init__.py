class ComfyGalBridge:
    """占位节点（无运算）。仅用于让 ComfyUI 加载本插件的 web 前端扩展：
    web/js/bridge.js 自动从图库拉取 #comfygal: 标识对应工作流并 loadGraphData。"""
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "nop"
    CATEGORY = "utils"
    def nop(self):
        return ("ok",)

NODE_CLASS_MAPPINGS = {"ComfyGalBridge": ComfyGalBridge}
NODE_DISPLAY_NAME_MAPPINGS = {"ComfyGalBridge": "Gallery Bridge (placeholder)"}
WEB_DIRECTORY = "./web"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]