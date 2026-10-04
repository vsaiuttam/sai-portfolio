/**
 * The six Indian seasons (ṛtu). The pond in the hero changes with them:
 * marigold petals in Vasanta, heat glints in Grishma, rain in Varsha,
 * fireflies in Sharad, floating diyas in Hemanta, mist and leaves in Shishira.
 */
export type Ritu = "vasanta" | "grishma" | "varsha" | "sharad" | "hemanta" | "shishira";

export const RITUS: Ritu[] = ["vasanta", "grishma", "varsha", "sharad", "hemanta", "shishira"];

export const RITU_META: Record<Ritu, { name: string; script: string; english: string; mood: string }> = {
  vasanta: { name: "Vasanta", script: "वसंत", english: "spring", mood: "marigold petals on the water" },
  grishma: { name: "Grishma", script: "ग्रीष्म", english: "summer", mood: "the sun glinting off still water" },
  varsha: { name: "Varsha", script: "वर्षा", english: "monsoon", mood: "monsoon rain on the pond" },
  sharad: { name: "Sharad", script: "शरद", english: "autumn", mood: "clear skies and fireflies" },
  hemanta: { name: "Hemanta", script: "हेमंत", english: "pre-winter", mood: "diyas floating after Diwali" },
  shishira: { name: "Shishira", script: "शिशिर", english: "winter", mood: "morning mist and falling leaves" },
};

/** Each ritu spans two months, from mid-month to mid-month (mid-March starts Vasanta). */
export function rituFor(date = new Date()): Ritu {
  // Shift by half a month so boundaries fall on the 15th.
  const m = date.getMonth() + (date.getDate() >= 15 ? 0.5 : 0);
  if (m >= 2.5 && m < 4.5) return "vasanta";
  if (m >= 4.5 && m < 6.5) return "grishma";
  if (m >= 6.5 && m < 8.5) return "varsha";
  if (m >= 8.5 && m < 10.5) return "sharad";
  if (m >= 10.5 || m < 0.5) return "hemanta";
  return "shishira";
}
