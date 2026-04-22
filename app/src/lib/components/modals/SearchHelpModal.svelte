<script>
  import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '$lib/components/ui/dialog/index.js';
  import { ui, closeModal } from '$lib/stores/ui.svelte.js';

  const open = $derived(ui.activeModal === 'search-help');

  function onOpenChange(next) {
    if (!next) closeModal();
  }
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent class="max-w-2xl">
    <DialogHeader>
      <DialogTitle>How to Search</DialogTitle>
      <DialogDescription>
        Phrase search, AND/OR keywords, full regex, verse-title filters, and volume filters.
      </DialogDescription>
    </DialogHeader>
    <div class="prose prose-sm max-w-none">
      <h4>Keyword Search (AND/OR)</h4>
      <p>If the "Search using regex" box is <strong>not</strong> checked:</p>
      <ul>
        <li>
          <strong>AND Search:</strong> Type words separated by <code> AND </code>
          (e.g. <code>faith AND hope</code>). Finds verses with <strong>both</strong> words, in any
          order. Auto-converted to regex: <code>faith.*?hope|hope.*?faith</code>.
        </li>
        <li>
          <strong>OR Search:</strong> Type words separated by <code> OR </code>
          (e.g. <code>love OR charity</code>). Finds verses with <strong>either</strong> word.
        </li>
        <li>
          <strong>Note:</strong> <code>AND</code> takes precedence over <code>OR</code>. Use regex
          mode for complex logic.
        </li>
      </ul>

      <h4>Exact Phrase Search</h4>
      <p>
        If you don't use <code>AND</code>/<code>OR</code> and regex is off, it searches for the
        exact word sequence.
      </p>

      <h4>Regular Expression (Regex) Search</h4>
      <p>Check "Search using regex" to use regex patterns.</p>
      <ul>
        <li>Example: <code>^And it came to pass</code> (Starts with...).</li>
        <li>Example: <code>Nephi|Lehi</code> (Contains either).</li>
        <li>Example: <code>baptis(m|ed)</code> (Contains "baptism" or "baptised").</li>
      </ul>

      <h4>Verse Title Filter</h4>
      <p>Always uses case-insensitive regex.</p>
      <ul>
        <li>Example: <code>^Moroni 10:</code></li>
        <li>Example: <code>1 Nephi 3:7$</code></li>
        <li>Example: <code>(John|Luke) \d+:1$</code></li>
      </ul>

      <h4>Volume Filters</h4>
      <p>Use the checkboxes in Filters to select which volumes to include.</p>
    </div>
  </DialogContent>
</Dialog>
