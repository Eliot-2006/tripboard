import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountWorkspace } from "@/components/trip/AccountWorkspace";
import { Unavailable } from "@/components/Unavailable";
import { currentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Trip · Tripboard" };

export default async function TripPage({ params }: PageProps<"/trips/[tripId]">) {
  const user = await currentUser();
  if (user.unavailable) return <Unavailable />;
  if (!user.id) redirect("/login");
  const { tripId } = await params;
  return <AccountWorkspace tripId={tripId} />;
}
