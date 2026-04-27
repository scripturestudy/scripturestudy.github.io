/**
 * Calling groups for General Conference speakers.
 *
 * The `r` (speaker_role) field in conference data is free-form and varies
 * across decades ("Of the Quorum of the Twelve Apostles", "Of the Council of
 * the Twelve", etc.). These regex-based groups collapse that variation into
 * a handful of coarse callings the user can filter on.
 *
 * A role matches every group whose `test` returns true. If none match, the
 * role is bucketed into `other`.
 */
export const CALLING_GROUPS = [
  {
    id: 'prophet',
    label: 'Prophet',
    test: (r) => /President of (the Church$|The Church of Jesus Christ of Latter-day Saints)/i.test(r),
  },
  {
    id: 'first-presidency',
    label: 'First Presidency',
    test: (r) => /First Presidency|President of (the|The) Church/i.test(r),
  },
  {
    id: 'apostles',
    label: 'Quorum of the Twelve',
    test: (r) => /Quorum of (the )?Twelve|Council of the Twelve/i.test(r),
  },
  {
    id: 'seventy',
    label: 'Seventy',
    test: (r) => /Seventy|Assistant to the Council of the Twelve/i.test(r),
  },
  {
    id: 'presiding-bishopric',
    label: 'Presiding Bishopric',
    test: (r) => /Presiding Bishop/i.test(r),
  },
  {
    id: 'relief-society',
    label: 'Relief Society',
    test: (r) => /Relief Society/i.test(r),
  },
  {
    id: 'young-women',
    label: 'Young Women',
    test: (r) => /Young Women/i.test(r),
  },
  {
    id: 'young-men',
    label: 'Young Men',
    test: (r) => /Young Men|Aaronic Priesthood/i.test(r),
  },
  {
    id: 'primary',
    label: 'Primary',
    test: (r) => /Primary/i.test(r),
  },
  {
    id: 'sunday-school',
    label: 'Sunday School',
    test: (r) => /Sunday School/i.test(r),
  },
  {
    id: 'patriarch',
    label: 'Patriarch',
    test: (r) => /Patriarch/i.test(r),
  },
  {
    id: 'other',
    label: 'Other',
    test: null,
  },
];

/**
 * @param {string} role
 * @returns {string[]} group ids the role belongs to (always non-empty)
 */
export function callingsForRole(role) {
  const out = [];
  for (const g of CALLING_GROUPS) {
    if (g.test && g.test(role || '')) out.push(g.id);
  }
  if (out.length === 0) out.push('other');
  return out;
}

/**
 * @param {string} role
 * @param {string[]} selectedIds  empty = match all
 */
export function roleMatchesCallings(role, selectedIds) {
  if (!selectedIds || !selectedIds.length) return true;
  const groups = callingsForRole(role);
  for (const gid of groups) if (selectedIds.includes(gid)) return true;
  return false;
}
