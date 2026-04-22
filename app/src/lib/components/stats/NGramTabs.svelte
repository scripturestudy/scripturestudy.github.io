<script>
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs/index.js';
  import NGramTable from './NGramTable.svelte';
  import WordCloud from './WordCloud.svelte';

  /** @type {{ngrams: {1:Array,2:Array,3:Array,4:Array}}} */
  let { ngrams } = $props();
  let active = $state('1');

  const cloudItems = $derived.by(() => {
    const n = parseInt(active, 10);
    const rows = ngrams?.[n] ?? [];
    return rows.map((r) => ({ text: r.word ?? r.phrase, total: r.total }));
  });

  const size = $derived(parseInt(active, 10));
</script>

<Tabs value={active} onValueChange={(v) => (active = v)} class="w-full">
  <TabsList class="grid grid-cols-4 w-full max-w-md">
    <TabsTrigger value="1">1-gram</TabsTrigger>
    <TabsTrigger value="2">2-gram</TabsTrigger>
    <TabsTrigger value="3">3-gram</TabsTrigger>
    <TabsTrigger value="4">4-gram</TabsTrigger>
  </TabsList>

  {#each [1, 2, 3, 4] as n}
    <TabsContent value={String(n)} class="space-y-4">
      <div>
        <h5 class="text-sm font-semibold mb-2 text-muted-foreground">
          {n === 1 ? 'Word' : n === 2 ? 'Phrase' : n === 3 ? 'Triplet' : 'Quartet'} Cloud
        </h5>
        <WordCloud items={active === String(n) ? cloudItems : []} ngramSize={n} />
      </div>
      <h5 class="text-sm font-semibold mb-2 text-muted-foreground">Frequency Table</h5>
      <NGramTable ngramSize={n} rows={ngrams?.[n] ?? []} />
    </TabsContent>
  {/each}
</Tabs>
