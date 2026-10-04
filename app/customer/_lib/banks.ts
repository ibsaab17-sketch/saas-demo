import type { Bank } from "./types";

/**
 * DEMO bank list for UI testing only.
 *
 * This is a small sample and is NOT a complete or authoritative list of
 * Ethiopian banks. In production, replace `getDemoBanks` with a lookup
 * against an authoritative, regularly maintained data source (for example a
 * `banks` table in the database) — see `services/data-service.ts`.
 */
export const DEMO_BANK_LIST_NOTICE =
  "Demo list for testing only — not a complete list of Ethiopian banks.";

const DEMO_BANKS: Bank[] = [
  { id: "demo-cbe", name: "Commercial Bank of Ethiopia", shortName: "CBE" },
  { id: "demo-awash", name: "Awash Bank", shortName: "Awash" },
  { id: "demo-dashen", name: "Dashen Bank", shortName: "Dashen" },
  { id: "demo-boa", name: "Bank of Abyssinia", shortName: "BoA" },
  { id: "demo-coop", name: "Cooperative Bank of Oromia", shortName: "Coop" },
];

export function getDemoBanks(): Bank[] {
  return DEMO_BANKS;
}

export function findDemoBank(bankId: string): Bank | undefined {
  return DEMO_BANKS.find((bank) => bank.id === bankId);
}
