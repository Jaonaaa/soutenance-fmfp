// Keep browser image requests and the offline precache on the same deck revision.
export const DECK_IMAGE_VERSION = 'jury-20261123-1';

export function customSlideImagePath(path) {
  return `${path}?v=15`;
}

export function slideImagePath(number) {
  return `slides-hifi/slide-${String(number).padStart(2, '0')}.jpg?v=${DECK_IMAGE_VERSION}`;
}
