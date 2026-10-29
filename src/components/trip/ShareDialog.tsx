"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEnableSharing, useRevokeSharing } from "@/lib/data/hooks";
import type { Trip } from "@/types";

type Props = { trip: Trip; open: boolean; onClose: () => void };

/** Turn the read-only link on, copy it, replace it with a new one, or turn it off. */
export function ShareDialog({ trip, open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <ShareDialogBody trip={trip} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function ShareDialogBody({ trip, onClose }: Omit<Props, "open">) {
  const linkId = useId();
  const enable = useEnableSharing();
  const revoke = useRevokeSharing();
  // What the last action did, read out by screen readers because nothing else on screen announces it.
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const busy = enable.isPending || revoke.isPending;
  const shared = trip.share_token !== null;
  const linkRef = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLButtonElement>(null);
  const wasShared = useRef(shared);
  // Turning sharing on or off swaps the controls, which would drop focus: it moves to the one that took their place.
  useEffect(() => {
    if (wasShared.current === shared) return;
    wasShared.current = shared;
    (shared ? linkRef : createRef).current?.focus();
  }, [shared]);
  const url = trip.share_token ? `${window.location.origin}/share/${trip.share_token}` : "";

  const run = async (action: () => Promise<unknown>, done: string) => {
    setFailed(false);
    setMessage("");
    try {
      await action();
      setMessage(done);
    } catch {
      setFailed(true);
      setMessage("We couldn't change sharing. Check your connection and try again.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setFailed(false);
      setMessage("Link copied.");
    } catch {
      setFailed(true);
      setMessage("We couldn't copy the link. Select it and copy it yourself.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <DialogTitle>Share “{trip.name}”</DialogTitle>
        <DialogDescription>
          Anyone with the link can see the itinerary and map, and nothing else: costs, budget, notes and confirmation
          numbers stay private. They can&apos;t change anything.
        </DialogDescription>
      </div>
      {trip.share_token ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={linkId}>Read-only link</Label>
            <Input ref={linkRef} id={linkId} readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11 px-4" onClick={copy}>
              Copy link
            </Button>
            <Button
              variant="outline"
              className="min-h-11 px-4"
              disabled={busy}
              onClick={() => run(() => enable.mutateAsync(trip.id), "Made a new link. The old one no longer works.")}
            >
              New link
            </Button>
            <Button
              variant="ghost"
              className="ml-auto min-h-11 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              onClick={() => run(() => revoke.mutateAsync(trip.id), "Sharing is off. The link no longer works.")}
            >
              Stop sharing
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            “New link” makes a fresh link and turns the current one off. Whoever has a link can pass it on, so stop sharing if
            it gets to the wrong person.
          </p>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button ref={createRef} className="min-h-11 px-4" disabled={busy} onClick={() => run(() => enable.mutateAsync(trip.id), "Sharing is on.")}>
            {busy ? "Creating…" : "Create read-only link"}
          </Button>
        </div>
      )}
      <p role="status" className="text-sm empty:hidden">
        {failed ? null : message}
      </p>
      <p role="alert" className="text-sm text-destructive empty:hidden">
        {failed ? message : null}
      </p>
      <div className="flex">
        <Button variant="outline" className="min-h-11 px-4" onClick={onClose}>
          Done
        </Button>
      </div>
    </>
  );
}
