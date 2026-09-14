// Lisbon remains on UTC+1 throughout this campaign. The end is exclusive.
export const galleryPromotionStart = Date.parse('2026-09-14T00:00:00+01:00');
export const galleryPromotionEnd = Date.parse('2026-09-19T00:00:00+01:00');
export function isGalleryPromotionActive(now: number) {
  return now >= galleryPromotionStart && now < galleryPromotionEnd;
}
