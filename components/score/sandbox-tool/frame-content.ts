// Adapted from CopilotKit/OpenIntelligentUI, MIT License.

import type { SandboxToolData } from "./schema";

export const RESIZE_MESSAGE_TYPE = "__ogui_resize";

export const PREVIEW_FRAME_CONTENT = "<head></head><body></body>";

export const CHART_JS_IMPORT_URL = "https://cdn.jsdelivr.net/npm/chart.js@4.4.9/auto/+esm";
export const D3_IMPORT_URL = "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

export const IMPORTMAP_SCRIPT_TAG = `<script type="importmap">${JSON.stringify({
  imports: {
    "chart.js/auto": CHART_JS_IMPORT_URL,
    d3: D3_IMPORT_URL,
  },
})}</script>`;

export const CSP_META_TAG =
  `<meta http-equiv="Content-Security-Policy" content="` +
  "default-src 'none'; " +
  "script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
  "style-src 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src https://fonts.gstatic.com data:; " +
  "img-src data: blob:; " +
  "connect-src https://cdn.jsdelivr.net" +
  `">`;

export const INSTRUMENT_SANS_LINK_TAG =
  '<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">';

export const SANDBOX_DESIGN_CSS = `
:root {
  color-scheme: dark;
  --bg: #0b0c0e;
  --surface: #111316;
  --surface-2: #17191d;
  --surface-active: #1d2025;
  --border: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.13);
  --text-primary: #f4f4f5;
  --text-secondary: #a4a8b0;
  --text-tertiary: #8a8f98;
  --brand: #dfff00;
  --brand-hover: #e8ff40;
  --on-brand: #0a0b0c;
  --brand-soft: rgba(223,255,0,0.12);
  --brand-border: rgba(223,255,0,0.28);
  --hot: #4ade80;
  --warm: #f5b544;
  --cold: #8a8f98;
  --danger: #f87171;
  --chart-1: #dfff00;
  --chart-2: #4ade80;
  --chart-3: #f5b544;
  --chart-4: #8a8f98;
  --chart-5: #ffffff;
  --r-sm: 4px;
  --r-md: 6px;
  --r-lg: 8px;
  --r-xl: 12px;
  --font-sans: 'Instrument Sans', -apple-system, system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 0;
  background: transparent;
}

body {
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  text-rendering: optimizeLegibility;
}

h1,
h2,
h3,
h4 {
  margin: 0 0 0.55em;
  color: var(--text-primary);
  font-weight: 650;
  line-height: 1.12;
}

h1 {
  font-size: 24px;
}

h2 {
  font-size: 20px;
}

h3 {
  font-size: 16px;
}

p {
  margin: 0 0 0.85em;
  color: var(--text-secondary);
}

a {
  color: var(--brand);
  text-decoration-color: var(--brand-border);
  text-underline-offset: 3px;
}

a:hover {
  color: var(--brand-hover);
}

.vw-card {
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--surface);
  padding: 16px;
}

button,
.vw-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 34px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-weight: 600;
  padding: 7px 12px;
  cursor: pointer;
}

button:hover,
.vw-button:hover {
  background: var(--surface-active);
}

button:focus-visible,
.vw-button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--brand-border);
  outline-offset: 2px;
}

button:disabled,
.vw-button[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.48;
}

.vw-primary {
  border-color: var(--brand);
  background: var(--brand);
  color: var(--on-brand);
}

.vw-primary:hover {
  border-color: var(--brand-hover);
  background: var(--brand-hover);
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface-2);
  color: var(--text-primary);
  font: inherit;
  padding: 8px 10px;
  accent-color: var(--brand);
}

input[type="range"] {
  padding-inline: 0;
}

::placeholder {
  color: var(--text-tertiary);
}

.vw-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.vw-band-hot,
.vw-band-warm,
.vw-band-cold {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
}

.vw-band-hot {
  background: rgba(74,222,128,0.12);
  color: var(--hot);
}

.vw-band-warm {
  background: rgba(245,181,68,0.13);
  color: var(--warm);
}

.vw-band-cold {
  background: rgba(138,143,152,0.14);
  color: var(--cold);
}

table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: var(--r-lg);
}

th,
td {
  border-bottom: 1px solid var(--border);
  padding: 10px 12px;
  text-align: left;
}

th {
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

td {
  color: var(--text-secondary);
}

tbody tr:hover {
  background: var(--surface-2);
}

@keyframes morph-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.morph-enter {
  animation: morph-enter 180ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }
}
`.trim();

const DESIGN_SYSTEM_STYLE_TAG = `<style>${SANDBOX_DESIGN_CSS}</style>`;
const OVERFLOW_HIDDEN_STYLE_TAG = "<style>html, body { overflow: hidden !important; }</style>";

function escapeStyleText(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

function escapeInlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function ensureHead(html: string): string {
  if (/<head[\s>]/i.test(html)) return html;
  return `<head></head>${html}`;
}

export function buildFinalFrameContent(html: string, css: string | undefined, data: SandboxToolData): string {
  const headContent =
    CSP_META_TAG +
    IMPORTMAP_SCRIPT_TAG +
    INSTRUMENT_SANS_LINK_TAG +
    DESIGN_SYSTEM_STYLE_TAG +
    (css ? `<style>${escapeStyleText(css)}</style>` : "") +
    `<script>window.VW_DATA = Object.freeze(${escapeInlineJson(data)});</script>`;
  const withHead = ensureHead(html);
  const openTag = withHead.match(/<head[^>]*>/i);
  if (!openTag || openTag.index === undefined) {
    return `<head>${headContent}</head>${withHead}`;
  }
  const insertAt = openTag.index + openTag[0].length;
  return withHead.slice(0, insertAt) + headContent + withHead.slice(insertAt);
}

export function buildPreviewHeadContent(css?: string, previewStyles?: string): string {
  const parts = [OVERFLOW_HIDDEN_STYLE_TAG, INSTRUMENT_SANS_LINK_TAG, DESIGN_SYSTEM_STYLE_TAG];
  if (css) parts.push(`<style>${escapeStyleText(css)}</style>`);
  if (previewStyles) parts.push(previewStyles);
  return parts.join("");
}

export function buildPreviewBodyMorph(body: string): string {
  return `(function() {
  var html = ${JSON.stringify(body)};
  if (typeof Idiomorph !== "undefined" && Idiomorph && Idiomorph.morph) {
    try {
      Idiomorph.morph(document.body, html, {
        morphStyle: 'innerHTML',
        callbacks: {
          beforeNodeAdded: function(node) {
            if (node.nodeType === 1) {
              node.classList.add('morph-enter');
              node.addEventListener('animationend', function() {
                node.classList.remove('morph-enter');
              }, { once: true });
            }
          }
        }
      });
    } catch (err) {
      document.body.innerHTML = html;
    }
  } else {
    document.body.innerHTML = html;
  }
})();`;
}

export const MEASUREMENT_JS = `
(function() {
  if (window.__oguiResizeInstalled) return;
  window.__oguiResizeInstalled = true;
  var style = document.createElement('style');
  style.textContent = 'html, body { overflow: hidden !important; height: auto !important; min-height: 0 !important; }';
  document.head.appendChild(style);
  function reportHeight() {
    var h = document.body.scrollHeight;
    var cs = getComputedStyle(document.body);
    h += parseFloat(cs.marginTop) || 0;
    h += parseFloat(cs.marginBottom) || 0;
    parent.postMessage({ type: '${RESIZE_MESSAGE_TYPE}', height: Math.ceil(h) }, '*');
  }
  var ro = new ResizeObserver(reportHeight);
  ro.observe(document.body);
  window.addEventListener('resize', reportHeight);
  window.addEventListener('load', reportHeight);
  var interval = setInterval(reportHeight, 200);
  setTimeout(function() { clearInterval(interval); }, 3000);
  reportHeight();
})();
`;
