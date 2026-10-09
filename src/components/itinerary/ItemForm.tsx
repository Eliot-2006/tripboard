"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hasEndDate,
  hasEndPlace,
  hasEndTimeZone,
  itemFormSchema,
  type ItemFormValues,
} from "@/lib/items/form";
import { timeZoneOptions } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ItemType, Trip } from "@/types";
import { PAYMENT_LABEL, STATUS_LABEL } from "./labels";

type A11y = { id: string; "aria-invalid"?: true; "aria-describedby"?: string };

type FieldProps = { id: string; label: string; error?: string; hint?: string; className?: string; children: (a11y: A11y) => ReactNode };

/** Label, control and its message, wired together so the message is announced with the field (UX-4). */
function Field({ id, label, error, hint, className, children }: FieldProps) {
  // An error replaces the hint, so only describe the field by what is on screen.
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-3 text-sm font-semibold">
        {title}
        {hint && <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

const COPY: Record<ItemType, { nameHint: string; start: string; end: string; places: [string, string] }> = {
  flight: { nameHint: "For example LAX to Tokyo", start: "Departure", end: "Arrival", places: ["From", "To"] },
  stay: { nameHint: "Hotel, inn or rental", start: "Check-in", end: "Check-out", places: ["Where", ""] },
  activity: {
    nameHint: "For example Senso-ji Temple or dinner in Gion",
    start: "Start",
    end: "End",
    places: ["Where", "Ends somewhere else (optional)"],
  },
};

type Props = {
  trip: Pick<Trip, "start_date" | "end_date" | "currency">;
  defaultValues: ItemFormValues;
  submitLabel: string;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Offered when adding: go back to the type picker, keeping what was typed. */
  onChangeType?: (values: ItemFormValues) => void;
};

export function ItemForm({ trip, defaultValues, submitLabel, onSubmit, onCancel, onDirtyChange, onChangeType }: Props) {
  const uid = useId();
  const schema = useMemo(() => itemFormSchema(trip), [trip]);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ItemFormValues>({ resolver: zodResolver(schema), defaultValues });
  const [saveError, setSaveError] = useState<string | null>(null);
  const zones = useMemo(() => timeZoneOptions(), []);

  useEffect(() => setFocus("title"), [setFocus]);
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const type = defaultValues.type;
  const copy = COPY[type];
  const flexible = useWatch({ control, name: "is_flexible" });
  const paid = useWatch({ control, name: "payment_status" }) === "paid";

  const id = (name: keyof ItemFormValues) => `${uid}-${name}`;
  const zoneList = `${uid}-zones`;
  type InputOpts = Partial<Pick<FieldProps, "hint" | "className">> & ComponentProps<typeof Input>;
  const input = (name: keyof ItemFormValues, label: string, { hint, className, ...rest }: InputOpts = {}) => (
    <Field id={id(name)} label={label} error={errors[name]?.message} hint={hint} className={className}>
      {(a11y) => <Input {...a11y} {...rest} {...register(name)} />}
    </Field>
  );
  const zoneInput = (name: "start_timezone" | "end_timezone", label: string) =>
    input(name, label, {
      className: "col-span-2",
      list: zoneList,
      autoComplete: "off",
      spellCheck: false,
      hint: "Type a city, like Tokyo or Los Angeles",
    });
  // Each place is its own group, so its fields can share short labels (From → Address, To → Address).
  const place = (end: "start" | "end", legend: string) => (
    <fieldset className="grid grid-cols-2 gap-3">
      <legend className="mb-2 text-sm font-medium text-muted-foreground">{legend}</legend>
      {input(`${end}_location_name`, "Place name", { className: "col-span-2", autoComplete: "off" })}
      {input(`${end}_address`, "Address", { className: "col-span-2", autoComplete: "off" })}
      {input(`${end}_lat`, "Latitude", { inputMode: "decimal" })}
      {input(`${end}_lng`, "Longitude", { inputMode: "decimal" })}
    </fieldset>
  );

  const submit = handleSubmit(async (values) => {
    setSaveError(null);
    try {
      await onSubmit(values);
    } catch {
      setSaveError("We couldn't save this item. Your changes are still here, so please try again.");
    }
  });

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <datalist id={zoneList}>
        {zones.map((z) => (
          <option key={z.value} value={z.value} label={z.label} />
        ))}
      </datalist>

      <div className="flex flex-col gap-3">
        {input("title", "Name", { hint: copy.nameHint, autoComplete: "off" })}
        {type === "flight" && (
          <div className="grid grid-cols-2 gap-3">
            {input("airline", "Airline (optional)", { autoComplete: "off" })}
            {input("flight_number", "Flight number (optional)", { autoComplete: "off" })}
          </div>
        )}
        {type === "activity" && (
          <Field id={id("category")} label="Kind">
            {(a11y) => (
              <NativeSelect {...a11y} {...register("category")}>
                <option value="activity">Activity</option>
                <option value="restaurant">Restaurant</option>
              </NativeSelect>
            )}
          </Field>
        )}
        {onChangeType && (
          <Button type="button" variant="link" className="min-h-11 self-start px-0" onClick={() => onChangeType(getValues())}>
            Not a {type}? Change type
          </Button>
        )}
      </div>

      <Section title="When">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5 accent-primary" {...register("is_flexible")} />
          No exact time (shows as &ldquo;Anytime&rdquo;)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {input("start_date", flexible ? "Day" : `${copy.start} date`, { type: "date", min: trip.start_date, max: trip.end_date })}
          {!flexible && input("start_time", `${copy.start} time`, { type: "time" })}
          {!flexible && zoneInput("start_timezone", hasEndTimeZone(type) ? `${copy.start} time zone` : "Time zone")}
          {!flexible && hasEndDate(type) && input("end_date", `${copy.end} date (optional)`, { type: "date" })}
          {!flexible &&
            input("end_time", `${copy.end} time (optional)`, {
              type: "time",
              hint: hasEndDate(type) ? undefined : "Earlier than the start means the next day",
            })}
          {!flexible && hasEndTimeZone(type) && zoneInput("end_timezone", `${copy.end} time zone`)}
        </div>
      </Section>

      <Section title="Where" hint="Optional. Items with latitude and longitude appear on the map.">
        {place("start", copy.places[0])}
        {hasEndPlace(type) && place("end", copy.places[1])}
      </Section>

      <Section title="Booking and cost">
        <div className="grid grid-cols-2 gap-3">
          <Field
            id={id("status")}
            label="Booking"
            error={errors.status?.message}
            hint={paid ? "Paid items stay reserved. Mark it unpaid to change this." : undefined}
          >
            {(a11y) => (
              <NativeSelect {...a11y} {...register("status")}>
                {(["idea", "planned", "reserved"] as const).map((s) => (
                  <option key={s} value={s} disabled={paid && s !== "reserved"}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field id={id("payment_status")} label="Payment">
            {(a11y) => (
              <NativeSelect
                {...a11y}
                {...register("payment_status", {
                  // Marking an item paid also reserves it (ITEM-7).
                  onChange: (e) => e.target.value === "paid" && setValue("status", "reserved", { shouldDirty: true }),
                })}
              >
                {(["unpaid", "paid"] as const).map((p) => (
                  <option key={p} value={p}>
                    {PAYMENT_LABEL[p]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          {input("estimated_cost", `Estimated cost (${trip.currency})`, { inputMode: "decimal" })}
          {input("actual_cost", `Actual cost (${trip.currency})`, { inputMode: "decimal" })}
          {input("confirmation_number", "Confirmation number", { className: "col-span-2", autoComplete: "off" })}
        </div>
      </Section>

      <Field id={id("notes")} label="Notes">
        {(a11y) => <Textarea {...a11y} rows={3} {...register("notes")} />}
      </Field>

      {saveError && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {saveError}
        </p>
      )}

      {/* Offset by the dialog padding so the bar sits flush with the dialog edge while the form scrolls. */}
      <div className="sticky -bottom-4 -mx-4 -mb-4 flex justify-end gap-2 border-t bg-popover p-4 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="min-h-11" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
