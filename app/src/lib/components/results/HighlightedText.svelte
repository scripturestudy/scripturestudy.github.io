<script>
  import { escapeRegex } from '$lib/utils/regex.js';

  /**
   * Render scripture text with matches wrapped in <span class="highlight">.
   * Silently falls back to unhighlighted text on regex error, same as the old app.
   *
   * Scripture content is treated as trusted data from our JSON file — we use
   * {@html} to inject the <span> markers. We HTML-escape non-match segments
   * so user-controlled regex output can't inject tags.
   */
  let { text = '', pattern = '', useRegex = false, caseSensitive = false } = $props();

  function htmlEscape(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const rendered = $derived.by(() => {
    if (!text) return '';
    if (!pattern) return htmlEscape(text);
    try {
      const p = useRegex ? pattern : escapeRegex(pattern);
      const flags = caseSensitive ? 'g' : 'gi';
      const rx = new RegExp(p, flags);
      let out = '';
      let last = 0;
      for (const m of text.matchAll(rx)) {
        out += htmlEscape(text.slice(last, m.index));
        out += `<span class="highlight">${htmlEscape(m[0])}</span>`;
        last = m.index + m[0].length;
      }
      out += htmlEscape(text.slice(last));
      return out;
    } catch {
      return htmlEscape(text);
    }
  });
</script>

<p class="text-sm text-gray-700">{@html rendered}</p>
