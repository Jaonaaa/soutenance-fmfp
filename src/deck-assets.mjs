// Keep browser image requests and the offline precache on the same deck revision.
export const DECK_IMAGE_VERSION = 'reserves-20261107-9';

export function customSlideImagePath(path) {
  return `${path}?v=12`;
}

export function slideImagePath(number) {
  return `slides-hifi/slide-${String(number).padStart(2, '0')}.jpg?v=${DECK_IMAGE_VERSION}`;
}
