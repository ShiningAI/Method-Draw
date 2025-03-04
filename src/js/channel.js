// Initialize communication channel
function initChannel() {
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
          svgCanvas.setSvgString(data.svg);
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
