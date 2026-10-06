"use client";
import { MapPin } from "lucide-react";
import { PLACES } from "@/lib/commute";
export default function PlaceSelect({
  label,
  value,
  onChange,
  any = false,
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  any?: boolean;
  name: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-input">
        <MapPin size={18} />
        <select
          name={name}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {any && <option value="">Any destination</option>}
          {PLACES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
