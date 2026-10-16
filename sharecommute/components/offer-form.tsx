"use client";
import { useState, type FormEvent } from "react";
import { Info, Plus } from "lucide-react";
import {
  DEMO_USER,
  TYPE_LABELS,
  departureAt,
  indiaDate,
  tomorrow,
  type PlaceId,
  type OfferInput,
  type RideType,
} from "@/lib/commute";
import PlaceSelect from "./place-select";
export default function OfferForm({
  submit,
  close,
}: {
  submit: (ride: OfferInput) => Promise<boolean>;
  close: () => void;
}) {
  const [origin, setOrigin] = useState("campus"),
    [destination, setDestination] = useState("shivajinagar"),
    [type, setType] = useState<RideType>("carpool"),
    [capacity, setCapacity] = useState(4);
  const max = type === "bike" ? 2 : type === "cab" ? 7 : 5;
  const [submitting, setSubmitting] = useState(false);
  const [repeat, setRepeat] = useState(false),
    [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]);
  async function offer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const ride: OfferInput = {
      id: crypto.randomUUID(),
      ownerId: DEMO_USER,
      host: "You",
      role: "Student",
      department: "Campus member",
      origin: origin as PlaceId,
      destination: destination as PlaceId,
      departure: departureAt(
        String(form.get("date")),
        String(form.get("time")),
      ),
      type,
      capacity,
      otherPassengers: 0,
      totalPaise: Math.round(Number(form.get("fare")) * 100),
      vehicle: String(form.get("vehicle")).trim(),
      note: String(form.get("note")).trim(),
      sample: false,
      status: "open",
      ...(repeat
        ? { recurring: { weekdays, endDate: String(form.get("endDate")) } }
        : {}),
    };
    try {
      if (await submit(ride)) close();
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <form onSubmit={offer} className="offer-form">
      <p className="muted">
        Going somewhere? Let someone from campus join you.
      </p>
      <div className="form-grid">
        <PlaceSelect
          label="Pickup point"
          name="origin"
          value={origin}
          onChange={setOrigin}
        />
        <PlaceSelect
          label="Drop-off point"
          name="destination"
          value={destination}
          onChange={setDestination}
        />
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Departure date</span>
          <input
            name="date"
            type="date"
            min={indiaDate()}
            defaultValue={tomorrow()}
            required
          />
        </label>
        <label className="field">
          <span>Departure time (IST)</span>
          <input name="time" type="time" defaultValue="17:00" required />
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Ride type</span>
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as RideType;
              setType(t);
              setCapacity(t === "bike" ? 2 : 4);
            }}
          >
            {Object.entries(TYPE_LABELS).map(([v, label]) => (
              <option value={v} key={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Total travellers, including you</span>
          <select
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          >
            {Array.from({ length: max - 1 }, (_, i) => (
              <option value={i + 2} key={i}>
                {i + 2} travellers · {i + 1} empty {i === 0 ? "seat" : "seats"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Vehicle or cab description</span>
          <input
            name="vehicle"
            placeholder="e.g. Maruti Swift · AC"
            maxLength={50}
            required
          />
        </label>
        <label className="field">
          <span>Total journey cost (₹)</span>
          <input
            name="fare"
            type="number"
            min="0"
            max="5000"
            step="0.01"
            placeholder="e.g. 180"
            required
          />
          <small>The whole journey cost, shared equally.</small>
        </label>
      </div>
      <label className="field">
        <span>
          Meeting note <span className="optional">(optional)</span>
        </span>
        <textarea
          name="note"
          maxLength={180}
          placeholder="Where should your co-riders meet you?"
          rows={2}
        />
      </label>
      <div className="repeat-options">
        <label className="check-label">
          <input
            type="checkbox"
            checked={repeat}
            onChange={(e) => setRepeat(e.target.checked)}
          />
          <span>Repeat this commute on weekdays</span>
        </label>
        {repeat && (
          <>
            <div className="weekday-options">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={weekdays.includes(i + 1)}
                    onChange={(e) =>
                      setWeekdays((days) =>
                        e.target.checked
                          ? [...days, i + 1]
                          : days.filter((d) => d !== i + 1),
                      )
                    }
                  />
                  {day}
                </label>
              ))}
            </div>
            <label className="field">
              <span>Repeat until</span>
              <input
                type="date"
                name="endDate"
                min={tomorrow()}
                defaultValue={indiaDate(new Date(Date.now() + 14 * 86400000))}
                required
              />
            </label>
            <small>
              Uses the same departure time in IST. Each selected day gets its
              own seats and bookings. Stop the schedule from My rides.
            </small>
          </>
        )}
      </div>
      <p className="inline-note">
        <Info size={16} />
        Your offer will be available to other signed-in campus members on this
        local server.
      </p>
      <button
        className="button primary full"
        type="submit"
        disabled={submitting}
      >
        <Plus size={18} />
        {submitting ? "Posting…" : "Post ride offer"}
      </button>
    </form>
  );
}
