import type { Metadata } from "next";
import { HouseLedgerDashboard } from "@/components/house-ledger-dashboard";

export const metadata: Metadata = {
  title: "House Ledger | Home Maintenance and Records",
  description:
    "Track home maintenance, appliance records, warranties, and issue logs in one elegant household operations dashboard.",
};

export default function Page() {
  return <HouseLedgerDashboard />;
}
