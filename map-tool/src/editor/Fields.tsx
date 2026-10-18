import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange(value: number): void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <Label className="field">
      <span>{label}</span>
      <Input
        type="number"
        value={text}
        step={step}
        min={min}
        max={max}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const next = Number(text);
          if (
            text.trim() &&
            Number.isFinite(next) &&
            (min === undefined || next >= min) &&
            (max === undefined || next <= max)
          )
            onChange(next);
          else setText(String(value));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </Label>
  );
}
export function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange(value: string): void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  const fieldId = useId();
  return (
    <div className="field">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={fieldId} className="w-full">
          <SelectValue placeholder="Chọn…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
