const STYLES_URL = chrome.runtime.getURL('src/styles.css');

let css = '';

/**
 * Fetches the stylesheet once. Must finish before any shadow root is created: inlining the CSS
 * means overlays render styled on their first frame instead of flashing unstyled icons.
 */
export async function loadStyles() {
  css = await (await fetch(STYLES_URL)).text();
}

/** Attaches an open shadow root to `host`, isolating `markup` from Meet's CSS and vice versa. */
export function attachStyledShadow(host, markup) {
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${css}</style>${markup}`;
  return root;
}
