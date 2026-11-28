// Keep browser image requests and the offline precache on the same deck revision.
export const DECK_IMAGE_VERSION = 'jury-20261126-1';

export function customSlideImagePath(path) {
  return `${path}?v=16`;
}

export function slideImagePath(number) {
  return `slides-hifi/slide-${String(number).padStart(2, '0')}.jpg?v=${DECK_IMAGE_VERSION}`;
}
