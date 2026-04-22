<script>
  import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '$lib/components/ui/dialog/index.js';
  import { ui, closeModal } from '$lib/stores/ui.svelte.js';

  const open = $derived(ui.activeModal === 'stats-help');
  function onOpenChange(next) { if (!next) closeModal(); }
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent class="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Understanding the Statistics</DialogTitle>
      <DialogDescription>
        How the numbers on the Statistics tab are computed.
      </DialogDescription>
    </DialogHeader>

    <div class="prose prose-sm max-w-none">
      <h4>Overall Summary</h4>
      <dl>
        <dt>Total Unique Scriptures Matched</dt>
        <dd>The number of distinct verses returned by your filters + criteria.</dd>
      </dl>

      <h4>Matches per Volume Chart</h4>
      <p>A horizontal bar chart showing matches per volume.</p>

      <h4>Word Forms Breakdown</h4>
      <p>
        Only shown for a non-regex, single-word search (e.g. "faith"). Lists words in the results
        that start with the normalized search term — "faith", "faithful", "faithfulness" etc.
      </p>

      <h4>N-gram Analysis</h4>
      <p>
        Most common words (1-gram), pairs (2-gram), triplets (3-gram), or quartets (4-gram) in the
        matched scriptures. Use "Exclude Stop Words" to focus on meaningful terms — excluding them
        also affects which adjacent words pair up in 2/3/4-grams.
      </p>

      <h5>Frequency Tables</h5>
      <dl>
        <dt>Total Count</dt>
        <dd>Total times this item appears across all matched scriptures.</dd>
        <dt>Unique Count</dt>
        <dd>Number of unique scriptures containing this item at least once.</dd>
        <dt>Freq/Scripture (1-gram)</dt>
        <dd>Average appearances per matched scripture.</dd>
        <dt>Freq/Word (1-gram)</dt>
        <dd>Proportion of this word relative to all words counted.</dd>
        <dt>Coverage (1-gram)</dt>
        <dd>Percentage of matched scriptures containing this word.</dd>
      </dl>
    </div>
  </DialogContent>
</Dialog>
