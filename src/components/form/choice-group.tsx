"use client";

import { Check } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** Single choice as a list of tappable rows (or a two-column grid for short labels). */
export function ChoiceGroup({
  label,
  value,
  onChange,
  options,
  columns = false,
  disabled = false,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; detail?: string }[];
  columns?: boolean;
  disabled?: boolean;
  /** When a heading above already says it: the label stays for screen readers only. */
  hideLabel?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className={cn("mb-2 text-footnote font-semibold", hideLabel && "sr-only")}>{label}</legend>
      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className={cn("grid gap-2", columns && "grid-cols-2")}
      >
        {options.map((option) => (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            className="flex pressable items-center gap-3 rounded-lg border border-rule bg-window px-4 py-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 data-[state=checked]:border-foreground"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-callout font-semibold">{option.label}</span>
              {option.detail ? (
                <span className="mt-0.5 block text-footnote text-muted-foreground">{option.detail}</span>
              ) : null}
            </span>
            <RadioGroupPrimitive.Indicator className="grid size-5.5 shrink-0 place-items-center rounded-full bg-signal text-signal-foreground">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </RadioGroupPrimitive.Indicator>
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
    </fieldset>
  );
}

/** Outline at rest, signal-filled when chosen. */
export function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-sm border-[1.5px] transition-colors",
        selected ? "border-foreground bg-signal text-signal-foreground" : "border-input",
      )}
    >
      {selected ? <Check className="size-4" strokeWidth={3} /> : null}
    </span>
  );
}
