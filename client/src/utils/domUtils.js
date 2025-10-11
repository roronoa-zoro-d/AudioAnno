/**
 * 在给定根元素或 wavesurfer 实例下查找波形元素并返回宽度（CSS 像素）
 * @param {HTMLElement} rootEl - waveform 容器元素（可能带 shadowRoot）
 * @param {Object} wavesurfer - WaveSurfer 实例（可选）
 * @param {Object} opts - 选项：{ maxAttempts, baseDelay }
 * @returns {Promise<number|null>} - 返回宽度（CSS 像素），找不到返回 null
 */
export async function getWaveformWidth(rootEl, wavesurfer, opts = {}) {
  const { maxAttempts = 8, baseDelay = 100 } = opts;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const findCandidates = () => {
    try {
      // 1. shadowRoot 下的 .canvases 容器优先
      if (rootEl && rootEl.shadowRoot) {
        const canvasesContainer = rootEl.shadowRoot.querySelector('.canvases') || rootEl.shadowRoot.querySelector('[part="canvases"]');
        if (canvasesContainer) {
          const cvs = canvasesContainer.querySelectorAll('canvas');
          if (cvs && cvs.length) return Array.from(cvs);
          const svgs = canvasesContainer.querySelectorAll('svg');
          if (svgs && svgs.length) return Array.from(svgs);
          return [canvasesContainer];
        }
      }

      // 2. 直接在 rootEl 内查找 canvas/svg
      if (rootEl) {
        const cvs = rootEl.querySelectorAll('canvas');
        if (cvs && cvs.length) return Array.from(cvs);
        const svgs = rootEl.querySelectorAll('svg');
        if (svgs && svgs.length) return Array.from(svgs);
      }

      // 3. wavesurfer.drawer 上的常见字段
      const d = wavesurfer && wavesurfer.drawer;
      if (d) {
        if (Array.isArray(d.canvases) && d.canvases.length) {
          return d.canvases.map(item => (item instanceof HTMLCanvasElement ? item : (item && item.canvas) ? item.canvas : null)).filter(Boolean);
        }
        if (d.frontCanvas instanceof HTMLCanvasElement) return [d.frontCanvas];
        if (d.backCanvas instanceof HTMLCanvasElement) return [d.backCanvas];
        if (d.canvas instanceof HTMLCanvasElement) return [d.canvas];
        if (d.wrapper) {
          const cvs2 = d.wrapper.querySelectorAll ? d.wrapper.querySelectorAll('canvas') : [];
          if (cvs2 && cvs2.length) return Array.from(cvs2);
          const sv2 = d.wrapper.querySelectorAll ? d.wrapper.querySelectorAll('svg') : [];
          if (sv2 && sv2.length) return Array.from(sv2);
          return [d.wrapper];
        }
      }
    } catch (err) {
      // ignore
    }
    return [];
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const candidates = findCandidates();
    if (candidates.length) {
      // 规范化并取最长宽度作为主参考（css 像素）
      const norm = candidates.map(c => {
        if (!c) return null;
        if (c instanceof HTMLCanvasElement) {
          const rect = c.getBoundingClientRect();
          return { el: c, cssWidth: rect.width || c.clientWidth || c.offsetWidth || 0 };
        }
        if (c instanceof SVGElement) {
          const rect = c.getBoundingClientRect();
          return { el: c, cssWidth: rect.width || c.clientWidth || c.offsetWidth || 0 };
        }
        // 容器或 wrapper
        if (c.getBoundingClientRect) {
          const rect = c.getBoundingClientRect();
          return { el: c, cssWidth: rect.width || c.clientWidth || c.offsetWidth || 0 };
        }
        return null;
      }).filter(Boolean);

      if (norm.length) {
        const chosen = norm.reduce((max, cur) => (cur.cssWidth > (max?.cssWidth || 0) ? cur : max), norm[0]);
        const width = chosen?.cssWidth || null;
        return width || null;
      }
    }

    // 未找到，等待再试（延迟逐步增加）
    await sleep(baseDelay * attempt);
  }

  // 最终 fallback 使用 rootEl 宽度
  try {
    if (rootEl && (rootEl.getBoundingClientRect || rootEl.clientWidth !== undefined)) {
      const rect = rootEl.getBoundingClientRect ? rootEl.getBoundingClientRect() : { width: rootEl.clientWidth || rootEl.offsetWidth || 0 };
      return rect.width || null;
    }
  } catch (e) {
    // ignore
  }

  return null;
}