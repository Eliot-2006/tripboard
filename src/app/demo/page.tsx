import type { Metadata } from "next";
import { DemoApp } from "./DemoApp";

export const metadata: Metadata = { title: "Demo · Tripboard" };

export default function DemoPage() {
  return <DemoApp />;
}
