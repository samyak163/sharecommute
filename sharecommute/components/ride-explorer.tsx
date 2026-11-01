"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  ArrowUpDown,
  Bike,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Info,
  List,
  Map,
  Navigation,
  Route,
  Search,
} from "lucide-react";
import {
  TYPE_LABELS,
  availableSeats,
  dayLabel,
  departureAt,
  place,
  timeLabel,
  type CommuteState,
  type PlaceId,
  type Ride,
  type RideType,
  type Search as RideSearch,
} from "@/lib/commute";
import RideSearchPanel from "./ride-search-panel";
import RideResultCard from "./ride-result-card";
import RouteOverview from "./route-overview";
import { rideHighlights } from "@/lib/ride-comparison";

export default function RideExplorer({
  state,
  userId,
  ready,
  draft,
  search,
  matches,
  filter,
  sort,
  selectedRide,
  onDraftChange,
  onSearch,
  onFilter,
  onSort,
  onSelect,
  onOpen,
  onReset,
}: {
  state: CommuteState;
  userId: string;
  ready: boolean;
  draft: RideSearch;
  search: RideSearch;
  matches: Ride[];
  filter: "all" | RideType;
  sort: string;
  selectedRide?: Ride;
  onDraftChange: (search: RideSearch) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onFilter: (filter: "all" | RideType) => void;
  onSort: (sort: string) => void;
  onSelect: (id: string) => void;
  onOpen: (ride: Ride) => void;
  onReset: () => void;
}) {
  const [display, setDisplay] = useState<"list" | "map">("list");
  const viewControls = useRef<HTMLDivElement>(null);
  const mapButton = useRef<HTMLButtonElement>(null);
  const currentIndex = selectedRide
    ? matches.findIndex((ride) => ride.id === selectedRide.id)
    : -1;
  const highlights = rideHighlights(state, matches, search, userId);
  function preview(ride: Ride) {
    onSelect(ride.id);
    setDisplay("map");
    requestAnimationFrame(() => {
      if (
        viewControls.current &&
        viewControls.current.parentElement!.clientWidth <= 760
      ) {
        mapButton.current?.focus({ preventScroll: true });
        viewControls.current.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
      }
    });
  }
  return (
    <div className="ride-explorer">
      <div className="explorer-heading">
        <div>
          <p className="explorer-eyebrow">MIT-WPU · PUNE</p>
          <h1>
            Find your campus ride<span>.</span>
          </h1>
        </div>
        <p>Good company, along your way.</p>
      </div>
      <RideSearchPanel
        draft={draft}
        applied={search}
        ready={ready}
        onChange={onDraftChange}
        onSubmit={onSearch}
      />
      <div
        className="explorer-view-controls"
        ref={viewControls}
        role="group"
        aria-label="Results view"
      >
        <button
          type="button"
          aria-pressed={display === "list"}
          onClick={() => setDisplay("list")}
        >
          <List size={16} />
          List<span>{matches.length}</span>
        </button>
        <button
          type="button"
          ref={mapButton}
          aria-pressed={display === "map"}
          onClick={() => setDisplay("map")}
        >
          <Map size={16} />
          Map
        </button>
      </div>
      <div className="explorer-workspace" data-view={display}>
        <section className="explorer-results" aria-label="Available rides">
          <div className="results-heading">
            <div>
              <h2>
                Rides going your way{" "}
                <span aria-live="polite">{ready ? matches.length : "…"}</span>
              </h2>
              <p>
                {place(search.origin).short} ·{" "}
                {search.destination
                  ? place(search.destination).short
                  : "All destinations"}{" "}
                · {dayLabel(departureAt(search.date, "12:00"))}
              </p>
            </div>
            <label className="sort-control">
              <ArrowUpDown size={14} />
              <select
                aria-label="Sort rides"
                value={sort}
                onChange={(event) => onSort(event.target.value)}
              >
                <option value="earliest">Earliest first</option>
                <option value="cost">Lowest cost</option>
              </select>
            </label>
          </div>
          <div className="filters" aria-label="Ride type filters">
            {(["all", "carpool", "cab", "bike"] as const).map((type) => {
              const Icon =
                type === "all" ? Route : type === "bike" ? Bike : CarFront;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={filter === type}
                  className={filter === type ? "selected" : ""}
                  onClick={() => onFilter(type)}
                >
                  <Icon size={15} />
                  {type === "all" ? "All rides" : TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
          {!ready ? (
            <div className="empty">
              <Route size={30} />
              <h3>Loading campus rides…</h3>
            </div>
          ) : matches.length === 0 ? (
            <div className="empty">
              <Search size={30} />
              <h3>No rides match this search</h3>
              <p>
                Try another destination, fewer seats, or a wider departure
                window.
              </p>
              <button
                type="button"
                className="button secondary"
                onClick={onReset}
              >
                Show tomorrow’s campus rides
              </button>
            </div>
          ) : (
            <div className="ride-list">
              {matches.map((ride, index) => (
                <RideResultCard
                  key={ride.id}
                  ride={ride}
                  state={state}
                  userId={userId}
                  seats={search.seats}
                  index={index}
                  selected={ride.id === selectedRide?.id}
                  highlights={highlights.get(ride.id)}
                  onPreview={() => preview(ride)}
                  onOpen={() => onOpen(ride)}
                />
              ))}
            </div>
          )}
          <p className="results-footnote">
            <Info size={13} />
            Cost shares include your selected seats and adjust when travellers
            join or cancel.
          </p>
        </section>
        <aside
          id="selected-ride-map"
          className="explorer-map"
          aria-label="Selected ride map"
        >
          <section className="route-panel">
            <div className="explorer-map-heading">
              <div>
                <span>
                  <Navigation size={15} />
                  Route preview
                </span>
                <p aria-live="polite" aria-atomic="true">
                  {!ready
                    ? "Loading campus rides…"
                    : selectedRide
                      ? `${selectedRide.host.split(" ")[0]}'s ride · ${timeLabel(selectedRide.departure)}`
                      : "No matching rides · try another search"}
                </p>
              </div>
              {matches.length > 1 && (
                <div className="route-pagination">
                  <button
                    type="button"
                    aria-label="Previous ride route"
                    disabled={currentIndex <= 0}
                    onClick={() => onSelect(matches[currentIndex - 1].id)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>
                    {currentIndex + 1}
                    <span> / {matches.length}</span>
                  </span>
                  <button
                    type="button"
                    aria-label="Next ride route"
                    disabled={currentIndex >= matches.length - 1}
                    onClick={() => onSelect(matches[currentIndex + 1].id)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              )}
            </div>
            <RouteOverview
              ride={selectedRide}
              origin={search.origin as PlaceId}
              destination={
                (search.destination || undefined) as PlaceId | undefined
              }
              explorer
            />
            {selectedRide && (
              <div className="explorer-selected-ride">
                <div>
                  <strong>
                    {place(selectedRide.origin).short}
                    <span aria-hidden="true"> → </span>
                    {place(selectedRide.destination).short}
                  </strong>
                  <span>
                    {availableSeats(state, selectedRide)}{" "}
                    {availableSeats(state, selectedRide) === 1
                      ? "seat"
                      : "seats"}{" "}
                    available · {TYPE_LABELS[selectedRide.type]}
                  </span>
                </div>
                <button
                  type="button"
                  className="button small primary"
                  onClick={() => onOpen(selectedRide)}
                >
                  Ride details
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
