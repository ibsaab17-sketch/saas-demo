import type { Bank } from "./types";

/**
 * Bank reference list used by the customer portal.
 *
 * IMPORTANT:
 * Existing bank IDs are preserved for compatibility
 * with recipient records already stored in Supabase.
 */
const BANKS: Bank[] = [
  {
    id: "demo-cbe",
    name: "Commercial Bank of Ethiopia",
    shortName: "CBE",
  },
  {
    id: "demo-awash",
    name: "Awash Bank",
    shortName: "Awash",
  },
  {
    id: "demo-dashen",
    name: "Dashen Bank",
    shortName: "Dashen",
  },
  {
    id: "demo-boa",
    name: "Bank of Abyssinia",
    shortName: "BoA",
  },
  {
    id: "demo-coop",
    name: "Cooperative Bank of Oromia",
    shortName: "Coop",
  },
];

export function getBanks(): Bank[] {
  return BANKS;
}

export function findBank(
  bankId: string,
): Bank | undefined {
  return BANKS.find(
    (bank) => bank.id === bankId,
  );
}