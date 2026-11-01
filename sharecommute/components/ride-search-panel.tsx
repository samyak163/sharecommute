"use client";
import { useState, type FormEvent } from "react";
import {
  CalendarDays,
  Clock3,
  Search,
  SlidersHorizontal,
  Users,
  ChevronDown,
} from "lucide-react";
import { indiaDate, type Search as RideSearch } from "@/lib/commute";
import PlaceSelect from "./place-select";

export default function RideSearchPanel({
  draft,
  applied,
  ready,
  onChange,
  onSubmit,
}: {
  draft: RideSearch;
  applied: RideSearch;
  ready: boolean;
  onChange: (search: RideSearch) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const changed = (Object.keys(draft) as (keyof RideSearch)[]).some(
    (key) => draft[key] !== applied[key],
  );
  const flexibility =
    draft.window === 0
      ? "Any departure time"
      : `±${draft.window === 60 ? "1 hour" : `${draft.window} min`}`;
  return (
    <section className="explorer-search" aria-label="Search campus rides">
      <form
        onSubmit={(event) => {
          onSubmit(event);
          if (draft.origin !== draft.destination) setExpanded(false);
        }}
      >
        <div className="explorer-search-fields">
          <PlaceSelect
            label="From"
            name="search-origin"
            value={draft.origin}
            onChange={(origin) => onChange({ ...draft, origin })}
          />
          <PlaceSelect
            label="To"
            name="search-destination"
            value={draft.destination}
            any
            onChange={(destination) => onChange({ ...draft, destination })}
          />
          <label className="field">
            <span>Date</span>
            <div className="field-input">
              <CalendarDays size={16} />
              <input
                aria-label="Travel date"
                type="date"
                min={indiaDate()}
                required
                value={draft.date}
                onChange={(event) =>
                  onChange({ ...draft, date: event.target.value })
                }
              />
            </div>
          </label>
          <label className="field">
            <span>Departure · IST</span>
            <div className="field-input">
              <Clock3 size={16} />
              <input
                aria-label="Preferred departure time"
                type="time"
                required
                value={draft.time}
                onChange={(event) =>
                  onChange({ ...draft, time: event.target.value })
                }
              />
            </div>
          </label>
        </div>
        <button
          className="button primary explorer-search-submit"
          type="submit"
          disabled={!ready}
        >
          <Search size={17} />
          <span>{changed ? "Update search" : "Search rides"}</span>
        </button>
        <div className="explorer-search-meta">
          <button
            className="search-options-toggle"
            type="button"
            aria-expanded={expanded}
            aria-controls="ride-search-options"
            onClick={() => setExpanded((value) => !value)}
          >
            <SlidersHorizontal size={14} />
            Search options
            <ChevronDown size={13} />
          </button>
          <span className="search-preferences">
            {draft.seats} {draft.seats === 1 ? "seat" : "seats"}
            <span aria-hidden="true"> · </span>
            {flexibility}
          </span>
          {changed && (
            <span className="search-draft-note" role="status">
              Changes ready to apply
            </span>
          )}
        </div>
        <div
          className="explorer-search-options"
          id="ride-search-options"
          hidden={!expanded}
        >
          <label>
            <Clock3 size={15} />
            <span>Time flexibility</span>
            <select
              aria-label="Time flexibility"
              value={draft.window}
              onChange={(event) =>
                onChange({ ...draft, window: Number(event.target.value) })
              }
            >
              <option value="15">±15 minutes</option>
              <option value="30">±30 minutes</option>
              <option value="60">±1 hour</option>
              <option value="0">Any time that day</option>
            </select>
          </label>
          <label>
            <Users size={15} />
            <span>Seats needed</span>
            <select
              aria-label="Seats needed"
              value={draft.seats}
              onChange={(event) =>
                onChange({ ...draft, seats: Number(event.target.value) })
              }
            >
              {[1, 2, 3, 4, 5, 6].map((seats) => (
                <option key={seats} value={seats}>
                  {seats} {seats === 1 ? "seat" : "seats"}
                </option>
              ))}
            </select>
          </label>
          <p>Costs shown include all your selected seats.</p>
        </div>
      </form>
    </section>
  );
}
