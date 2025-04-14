// Initialize communication channel
function initChannel() {
  // Check if running inside an iframe
  window.methodDrawConfig = window.methodDrawConfig || {};
  window.methodDrawConfig.isEmbedded = (window.self !== window.top);
  console.log("Method-Draw running in " + (window.methodDrawConfig.isEmbedded ? "embedded" : "standalone") + " mode");

  // 等待DOM加载完成后更新UI
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateUIForEmbeddedMode);
  } else {
    // DOM已加载完成，直接执行
    updateUIForEmbeddedMode();
  }

  // Notify parent that drawsvg is ready
  window.parent.postMessage({ type: "onDrawSVGReady" }, "*");
  console.log("onDrawSVGReady");

  // Handle messages from parent
  window.addEventListener("message", function (event) {
    if (!event.data || !event.data.type) return;

    const { type, data, messageId } = event.data;

    switch (type) {
      case "loadStringSVG":
        try {
          // 类似clickClear的行为，但不显示确认对话框，直接执行清除操作
          
          // 1. 先清空画布（会重置撤销栈和创建默认图层）
          svgCanvas.clear();
          
          // 2. 设置选择模式
          svgCanvas.setMode('select');
          
          // 3. 获取当前分辨率
          var res = svgCanvas.getResolution();
          
          // 4. 设置回原始分辨率（保持画布大小）
          svgCanvas.setResolution(res.w, res.h);
          
          // 5. 加载用户提供的SVG
          svgCanvas.setSvgString(data.svg);
          
          // 6. 再次重置撤销栈，防止用户撤销回到空白画布
          svgCanvas.undoMgr.resetUndoStack();
          
          // 7. 自动调整缩放级别以适应可视区域（使用预设的缩放级别）
          try {
            // 获取工作区域的尺寸
            var workarea = document.getElementById('workarea');
            if (workarea) {
              // 获取当前SVG内容的边界框
              var bbox = svgCanvas.getStrokedBBox();
              if (bbox && bbox.width && bbox.height) {
                // 考虑滚动条宽度
                var scrbarWidth = 15;
                var workarea_width = workarea.clientWidth - scrbarWidth;
                var workarea_height = workarea.clientHeight - scrbarWidth;
                
                // 计算适合当前内容的缩放比例
                var w_zoom = Math.round((workarea_width / bbox.width) * 95) / 100;
                var h_zoom = Math.round((workarea_height / bbox.height) * 95) / 100;
                var optimalZoom = Math.min(w_zoom, h_zoom);
                
                // 预设的缩放级别数组（与#zoom_select对应）
                var predefinedZooms = [0.06, 0.12, 0.16, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 16];
                
                // 找到最接近的预设缩放级别
                var closestZoom = 1; // 默认100%
                var minDiff = Number.MAX_VALUE;
                for (var i = 0; i < predefinedZooms.length; i++) {
                  var diff = Math.abs(predefinedZooms[i] - optimalZoom);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestZoom = predefinedZooms[i];
                  }
                }
                
                // 如果计算出的缩放级别小于6%，使用6%以保证可见性
                if (closestZoom < 0.06) {
                  closestZoom = 0.06;
                }
                
                // 使用UI控件设置缩放级别，这样会触发正常的缩放流程
                var zoomPercent = Math.round(closestZoom * 100);
                var zoomSelect = document.getElementById('zoom_select');
                var zoomInput = document.getElementById('zoom');
                
                if (zoomInput) {
                  zoomInput.value = zoomPercent;
                  // 触发change事件
                  var evt = document.createEvent('HTMLEvents');
                  evt.initEvent('change', false, true);
                  zoomInput.dispatchEvent(evt);
                } else if (zoomSelect) {
                  // 如果没有找到#zoom输入框，尝试使用select控件
                  for (var i = 0; i < zoomSelect.options.length; i++) {
                    if (parseInt(zoomSelect.options[i].value) === zoomPercent) {
                      zoomSelect.selectedIndex = i;
                      // 触发change事件
                      var evt = document.createEvent('HTMLEvents');
                      evt.initEvent('change', false, true);
                      zoomSelect.dispatchEvent(evt);
                      break;
                    }
                  }
                } else {
                  // 如果找不到UI控件，直接设置缩放
                  svgCanvas.setZoom(closestZoom);
                  // 更新画布
                  if (typeof window.updateCanvas === 'function') {
                    window.updateCanvas(true);
                  }
                }
              }
            }
          } catch (zoomErr) {
            console.warn("自动缩放失败，使用默认缩放:", zoomErr);
          }
          
          // 8. 通知扩展新文档已创建
          svgCanvas.runExtensions('onNewDocument');
          
          // 9. 返回成功响应
          event.source.postMessage(
            {
              type: "loadStringSVG:response",
              messageId,
              success: true,
            },
            "*"
          );
        } catch (err) {
          console.error("Error loading SVG:", err);
          event.source.postMessage(
            {
              type: "loadStringSVG:response",
              messageId,
              success: false,
              error: err.message,
            },
            "*"
          );
        }
        break;

      case "setFeatureDisabled":
        try {
          // 允许父页面控制功能的禁用状态
          if (data && typeof data.isDisabled === 'boolean') {
            window.methodDrawConfig.isEmbedded = data.isDisabled;
            console.log("Method-Draw features " + (data.isDisabled ? "disabled" : "enabled") + " by parent");
            
            // 更新UI
            updateUIForEmbeddedMode();
          }
          event.source.postMessage(
            {
              type: "setFeatureDisabled:response",
              messageId,
              success: true,
            },
            "*"
          );
        } catch (err) {
          console.error("Error setting feature disabled state:", err);
          event.source.postMessage(
            {
              type: "setFeatureDisabled:response",
              messageId,
              success: false,
              error: err.message,
            },
            "*"
          );
        }
        break;

      case "getSVG":
        try {
          const svgString = svgCanvas.getSvgString();
          event.source.postMessage(
            {
              type: "getSVG:response",
              messageId,
              success: true,
              data: svgString,
            },
            "*"
          );
        } catch (err) {
          console.error("Error getting SVG:", err);
          event.source.postMessage(
            {
              type: "getSVG:response",
              messageId,
              success: false,
              error: err.message,
            },
            "*"
          );
        }
        break;

      case "onSaveSVG":
        try {
          const svgString = svgCanvas.getSvgString();
          event.source.postMessage(
            {
              type: "onSaveSVG:response",
              messageId,
              success: true,
              data: svgString,
            },
            "*"
          );
        } catch (err) {
          console.error("Error saving SVG:", err);
          event.source.postMessage(
            {
              type: "onSaveSVG:response",
              messageId,
              success: false,
              error: err.message,
            },
            "*"
          );
        }
        break;
    }
  });
}

initChannel();

/**
 * 根据嵌入状态更新UI
 * 在嵌入模式下禁用新建文档和打开SVG按钮
 */
function updateUIForEmbeddedMode() {
  if (window.methodDrawConfig && window.methodDrawConfig.isEmbedded) {
    // 为body添加嵌入模式的类
    document.body.classList.add('embedded-mode');
    
    // 禁用新建文档按钮
    const clearButton = document.getElementById('tool_clear');
    if (clearButton) {
      clearButton.classList.add('disabled-in-embed');
      clearButton.setAttribute('title', '在嵌入模式下无法使用新建文档功能');
    }
    
    // 禁用打开SVG按钮
    const openButton = document.getElementById('tool_open');
    if (openButton) {
      openButton.classList.add('disabled-in-embed');
      openButton.setAttribute('title', '在嵌入模式下无法使用打开SVG功能');
    }
  } else {
    // 移除嵌入模式类
    document.body.classList.remove('embedded-mode');
    
    // 启用按钮
    const clearButton = document.getElementById('tool_clear');
    if (clearButton) {
      clearButton.classList.remove('disabled-in-embed');
      clearButton.setAttribute('title', '新建文档 [Ctrl+N]');
    }
    
    const openButton = document.getElementById('tool_open');
    if (openButton) {
      openButton.classList.remove('disabled-in-embed');
      openButton.setAttribute('title', '打开SVG [Ctrl+O]');
    }
  }
}
