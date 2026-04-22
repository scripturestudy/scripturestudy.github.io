export const HARDCODED_VOLUME_ORDER = [
  'Old Testament',
  'New Testament',
  'Book of Mormon',
  'Doctrine and Covenants',
  'Pearl of Great Price',
];

export const VOLUME_ACRONYM_MAP = {
  'D&C': 'Doctrine and Covenants',
  BoM: 'Book of Mormon',
  BofM: 'Book of Mormon',
  OT: 'Old Testament',
  NT: 'New Testament',
  PoGP: 'Pearl of Great Price',
  PGP: 'Pearl of Great Price',
  Ne: 'Nephi',
};

export function normalizeVolumeName(name) {
  return VOLUME_ACRONYM_MAP[name] || name;
}
