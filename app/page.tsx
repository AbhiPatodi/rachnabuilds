import type { Metadata } from "next";
import HomeV2Client from "./HomeV2Client";

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://rachnabuilds.com',
  },
};

export default function Home() {
  return <HomeV2Client />;
}
