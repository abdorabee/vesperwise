/**
 * Previous Polar product ids. A webhook for one of these is logged and ignored
 * so Polar does not retry a product we will never credit again.
 * A product id that is neither archived nor mapped from POLAR_PRODUCT_* fails
 * the webhook so Polar retries after the env vars are set.
 */
export const ARCHIVED_POLAR_PRODUCT_IDS = new Set([
  "490f7958-4635-4780-9b71-5075d4e24738",
  "244043a6-6977-436e-b360-a69628536350",
  "fb38478b-4153-4c29-9fa6-5cf0d5b4579b",
  "c127df13-7f09-4e82-9212-dad3be4bedf0",
  "921ed2f3-6a69-4d4f-be66-2a1638c8e296",
  "a5b6f450-6013-46c2-b447-1cea114c7236",
  "6bfbde1c-2b9d-4b66-a6fd-6179e1850f3c",
]);

export function isArchivedPolarProduct(productId: string): boolean {
  return ARCHIVED_POLAR_PRODUCT_IDS.has(productId);
}
