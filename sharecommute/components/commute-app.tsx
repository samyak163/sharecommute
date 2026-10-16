"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  Route,
  MapPin,
  CalendarDays,
  Clock3,
  Search as SearchIcon,
  CarFront,
  Bike,
  Users,
  Plus,
  X,
  Check,
  ShieldCheck,
  Leaf,
  ArrowUpDown,
  SlidersHorizontal,
  Info,
  Navigation,
  Ticket,
  RotateCcw,
  GraduationCap,
  CircleHelp,
  LogOut,
} from "lucide-react";
import Modal from "./commute-modal";
import PlaceSelect from "./place-select";
import OfferForm from "./offer-form";
import RouteOverview from "./route-overview";
import {
  TYPE_LABELS,
  availableSeats,
  bookingShare,
  dayLabel,
  departureAt,
  findRides,
  indiaDate,
  money,
  passengerSeats,
  place,
  quote,
  splitFare,
  timeLabel,
  tomorrow,
  type CommuteState,
  type Ride,
  type RideType,
  type Search,
} from "@/lib/commute";
import { api, ApiError } from "@/lib/api";
import { useCommuteSession } from "@/hooks/use-commute-session";
import AdminPanel from "./admin-panel";
import ReportForm from "./report-form";
import SignInPanel from "./sign-in-panel";

const iconFor = (type: RideType) => (type === "bike" ? Bike : CarFront);
const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
type ModalState =
  | { kind: "ride"; rideId: string }
  | { kind: "offer" }
  | { kind: "help" }
  | { kind: "report"; rideId: string }
  | { kind: "stopSchedule"; id: string }
  | { kind: "cancel"; bookingId?: string; rideId?: string }
  | null;

export default function CommuteApp() {
  const { state, session, ready, warning, reload, apply, signOut, busy } =
    useCommuteSession();
  const user = session.user;
  const userId = user?.id ?? "";
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [view, setView] = useState<"find" | "rides" | "admin">("find");
  const [draft, setDraft] = useState<Search>({
    origin: "campus",
    destination: "",
    date: tomorrow(),
    time: "17:00",
    window: 60,
    seats: 1,
  });
  const [search, setSearch] = useState(draft),
    [filter, setFilter] = useState<"all" | RideType>("all"),
    [sort, setSort] = useState("earliest"),
    [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null),
    [bookSeats, setBookSeats] = useState(1),
    [rideTab, setRideTab] = useState<"joined" | "offered">("joined");
  useEffect(() => {
    if (!feedback || feedback.error) return;
    const timer = setTimeout(() => setFeedback(null), 6000);
    return () => clearTimeout(timer);
  }, [feedback]);
  async function commit(
    action: () => Promise<{ state: CommuteState }>,
    message: string,
  ) {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    try {
      const result = await action();
      apply(result.state);
      setFeedback({ message, error: false });
      return true;
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "The request could not be completed.",
        error: true,
      });
      if (error instanceof ApiError && error.status === 401) {
        busy.current = false;
        await reload();
      }
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function logout() {
    if (pending) return;
    try {
      await signOut();
      setView("find");
      setModal(null);
      setFeedback(null);
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : "Could not sign out.",
        error: true,
      });
    }
  }
  function doSearch(e: FormEvent) {
    e.preventDefault();
    if (draft.origin === draft.destination) {
      setFeedback({
        message: "Choose different pickup and drop-off points.",
        error: true,
      });
      return;
    }
    setSearch({ ...draft });
    setSelected(null);
    setView("find");
  }
  const matches = ready
    ? findRides(state, search, Date.now(), userId)
        .filter((r) => filter === "all" || r.type === filter)
        .sort((a, b) =>
          sort === "cost"
            ? quote(state, a, search.seats) - quote(state, b, search.seats)
            : new Date(a.departure).getTime() - new Date(b.departure).getTime(),
        )
    : [];
  const selectedRide = state.rides.find((r) => r.id === selected) ?? matches[0];
  const modalRide =
    modal?.kind === "ride"
      ? state.rides.find((r) => r.id === modal.rideId)
      : undefined;
  const myBookings = state.bookings
      .filter((b) => b.userId === userId)
      .slice()
      .reverse(),
    myOffers = state.rides.filter((r) => r.ownerId === userId);
  const activeCount =
    myBookings.filter((b) => b.status === "confirmed").length +
    myOffers.filter((r) => r.status === "open").length;
  const showRide = (ride: Ride) => {
      setBookSeats(Math.min(search.seats, availableSeats(state, ride)) || 1);
      setSelected(ride.id);
      setModal({ kind: "ride", rideId: ride.id });
    },
    close = () => {
      setModal(null);
      setFeedback((prev) => (prev?.error ? null : prev));
    };
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => setView("find")}
            aria-label="ShareCommute home"
          >
            <span className="brand-mark">
              <Route size={23} />
            </span>
            <span>
              share<span className="brand-light">commute</span>
              <small>YOUR CAMPUS. YOUR PEOPLE.</small>
            </span>
          </button>
          <nav aria-label="Main navigation">
            <button
              aria-current={view === "find" ? "page" : undefined}
              onClick={() => setView("find")}
            >
              Find a ride
            </button>
            <button
              aria-current={view === "rides" ? "page" : undefined}
              onClick={() => setView("rides")}
            >
              My rides
              {activeCount > 0 && (
                <span className="nav-count">{activeCount}</span>
              )}
            </button>
            {user?.isAdmin && (
              <button
                aria-current={view === "admin" ? "page" : undefined}
                onClick={() => setView("admin")}
              >
                Admin
              </button>
            )}
            <button
              className="help-nav"
              onClick={() => setModal({ kind: "help" })}
            >
              How it works
            </button>
          </nav>
          <div className="header-actions">
            <span className="campus-badge">
              <GraduationCap size={17} />
              MIT-WPU
            </span>
            <button
              className="button primary"
              onClick={() => setModal({ kind: "offer" })}
              disabled={!ready || !user || pending}
            >
              <Plus size={17} />
              Offer a ride
            </button>
            {user && (
              <>
                <span className="user-avatar" title={user.email}>
                  {initials(user.name)}
                </span>
                <button
                  className="account-button"
                  onClick={logout}
                  disabled={pending}
                  aria-label="Sign out"
                >
                  <LogOut size={17} />
                  <span>Sign out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="main-container">
        <div className="demo-strip">
          <span>
            <span className="demo-tag">LOCAL</span>
            {user ? (
              <>
                {user.name} ·{" "}
                {user.verification === "email"
                  ? "Email verified"
                  : "Development account"}{" "}
                · Shared local database
              </>
            ) : (
              "Sign in with your institutional email to find and offer rides."
            )}
          </span>
          {user && (
            <button onClick={() => void reload()} disabled={pending}>
              <RotateCcw size={13} />
              Refresh rides
            </button>
          )}
        </div>
        {warning && (
          <p className="warning" role="status">
            {warning}
          </p>
        )}
        {user ? (
          <>
            {view === "find" ? (
              <>
                <section className="intro">
                  <div>
                    <p className="eyebrow">
                      A LITTLE LESS SOLO. A LOT MORE TOGETHER.
                    </p>
                    <h1>
                      Your campus commute,
                      <br />
                      <span>with good company.</span>
                    </h1>
                    <p className="intro-copy">
                      Find your way home. Share a seat. Split the cost.
                    </p>
                  </div>
                  <div className="intro-aside">
                    <span className="community-symbol">
                      <Users size={30} />
                    </span>
                    <p>
                      A familiar route.
                      <br />
                      <strong>A new co-rider.</strong>
                    </p>
                    <span className="pune-tag">
                      <MapPin size={13} />
                      Pune campus community
                    </span>
                  </div>
                </section>
                <section
                  className="search-panel"
                  aria-label="Search campus rides"
                >
                  <div className="search-top">
                    <span>
                      <SearchIcon size={18} />
                      Where are you headed?
                    </span>
                    <span className="search-note">
                      A shared seat is a better way to go.
                    </span>
                  </div>
                  <form onSubmit={doSearch}>
                    <div className="search-fields">
                      <PlaceSelect
                        label="FROM"
                        name="search-origin"
                        value={draft.origin}
                        onChange={(v) => setDraft({ ...draft, origin: v })}
                      />
                      <PlaceSelect
                        label="TO"
                        name="search-destination"
                        any
                        value={draft.destination}
                        onChange={(v) => setDraft({ ...draft, destination: v })}
                      />
                      <label className="field">
                        <span>DATE</span>
                        <div className="field-input">
                          <CalendarDays size={18} />
                          <input
                            aria-label="Travel date"
                            type="date"
                            min={indiaDate()}
                            required
                            value={draft.date}
                            onChange={(e) =>
                              setDraft({ ...draft, date: e.target.value })
                            }
                          />
                        </div>
                      </label>
                      <label className="field">
                        <span>DEPARTURE (IST)</span>
                        <div className="field-input">
                          <Clock3 size={18} />
                          <input
                            aria-label="Preferred departure time"
                            type="time"
                            required
                            value={draft.time}
                            onChange={(e) =>
                              setDraft({ ...draft, time: e.target.value })
                            }
                          />
                        </div>
                      </label>
                      <button
                        className="button lime"
                        type="submit"
                        disabled={!ready}
                      >
                        <SearchIcon size={18} />
                        Find a ride
                      </button>
                    </div>
                    <div className="search-options">
                      <label>
                        <SlidersHorizontal size={14} />
                        Time flexibility
                        <select
                          aria-label="Time flexibility"
                          value={draft.window}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              window: Number(e.target.value),
                            })
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
                        Seats
                        <select
                          aria-label="Seats needed"
                          value={draft.seats}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              seats: Number(e.target.value),
                            })
                          }
                        >
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option value={n} key={n}>
                              {n} {n === 1 ? "seat" : "seats"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span>
                        <Info size={14} />
                        Costs include your selected seats.
                      </span>
                    </div>
                  </form>
                </section>
                <div className="content-grid">
                  <section className="results" aria-label="Available rides">
                    <div className="results-heading">
                      <div>
                        <h2>
                          Rides going your way{" "}
                          <span>{ready ? matches.length : "…"}</span>
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
                        <ArrowUpDown size={15} />
                        <select
                          aria-label="Sort rides"
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          <option value="earliest">Earliest first</option>
                          <option value="cost">Lowest cost</option>
                        </select>
                      </label>
                    </div>
                    <div className="filters" aria-label="Ride type filters">
                      {(["all", "carpool", "cab", "bike"] as const).map((t) => {
                        const Icon = t === "all" ? Route : iconFor(t);
                        return (
                          <button
                            key={t}
                            aria-pressed={filter === t}
                            className={filter === t ? "selected" : ""}
                            onClick={() => {
                              setFilter(t);
                              setSelected(null);
                            }}
                          >
                            <Icon size={16} />
                            {t === "all" ? "All rides" : TYPE_LABELS[t]}
                          </button>
                        );
                      })}
                    </div>
                    {!ready ? (
                      <div className="empty">
                        <Route size={30} />
                        <h3>Getting the demo ready…</h3>
                      </div>
                    ) : matches.length === 0 ? (
                      <div className="empty">
                        <SearchIcon size={32} />
                        <h3>No rides match this search</h3>
                        <p>
                          Try another destination, fewer seats, or a wider
                          departure window.
                        </p>
                        <button
                          className="button secondary"
                          onClick={() => {
                            const fresh = {
                              origin: "campus",
                              destination: "",
                              date: tomorrow(),
                              time: "17:00",
                              window: 60,
                              seats: 1,
                            };
                            setDraft(fresh);
                            setSearch(fresh);
                            setFilter("all");
                          }}
                        >
                          Show tomorrow’s campus rides
                        </button>
                      </div>
                    ) : (
                      <div className="ride-list">
                        {matches.map((ride, index) => {
                          const Icon = iconFor(ride.type),
                            booking = state.bookings.find(
                              (b) =>
                                b.rideId === ride.id &&
                                b.userId === userId &&
                                b.status === "confirmed",
                            ),
                            booked = !!booking;
                          return (
                            <article
                              className={`ride-card ${selectedRide?.id === ride.id ? "focused" : ""}`}
                              key={ride.id}
                            >
                              <div className="ride-person">
                                <span className={`avatar avatar-${index % 4}`}>
                                  {initials(ride.host)}
                                </span>
                                <div>
                                  <h3>
                                    {ride.host}
                                    <span className="role-badge">
                                      {ride.role}
                                    </span>
                                  </h3>
                                  <p>{ride.department}</p>
                                </div>
                                <span
                                  className={`type-badge type-${ride.type}`}
                                >
                                  <Icon size={14} />
                                  {TYPE_LABELS[ride.type]}
                                </span>
                              </div>
                              <div className="ride-body">
                                <div className="ride-path">
                                  <div>
                                    <span className="path-dot" />
                                    <div>
                                      <strong>{place(ride.origin).name}</strong>
                                      <small>Pickup point</small>
                                    </div>
                                    <time>{timeLabel(ride.departure)}</time>
                                  </div>
                                  <div>
                                    <span className="path-square" />
                                    <div>
                                      <strong>
                                        {place(ride.destination).name}
                                      </strong>
                                      <small>
                                        Drop-off ·{" "}
                                        {place(ride.destination).area}
                                      </small>
                                    </div>
                                  </div>
                                </div>
                                <div className="ride-price">
                                  <strong>
                                    {money(
                                      booking
                                        ? bookingShare(state, ride, booking)
                                        : quote(state, ride, search.seats),
                                    )}
                                  </strong>
                                  <span>
                                    for {booking?.seats ?? search.seats}{" "}
                                    {(booking?.seats ?? search.seats) === 1
                                      ? "seat"
                                      : "seats"}
                                  </span>
                                  <small>
                                    {booked
                                      ? "Your current cost share"
                                      : "Estimated cost share"}
                                  </small>
                                </div>
                              </div>
                              <div className="ride-bottom">
                                <div>
                                  <span>
                                    <Users size={14} />
                                    {availableSeats(state, ride)}{" "}
                                    {availableSeats(state, ride) === 1
                                      ? "seat"
                                      : "seats"}{" "}
                                    left
                                  </span>
                                  <span className="vehicle-label">
                                    <Icon size={14} />
                                    {ride.vehicle}
                                  </span>
                                </div>
                                <button
                                  className={`button small ${booked ? "secondary" : "primary"}`}
                                  onClick={() => showRide(ride)}
                                >
                                  {booked ? "View booking" : "View ride"}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                    <p className="results-footnote">
                      <Info size={14} />
                      Estimates split the journey cost equally after you join.
                      The share changes when travellers join or cancel.
                    </p>
                  </section>
                  <aside className="ride-aside">
                    <section className="route-panel">
                      <div className="panel-heading">
                        <Navigation size={17} />
                        <h2>Along the way</h2>
                        <span>PUNE</span>
                      </div>
                      <RouteOverview ride={selectedRide} />
                      <div className="route-summary">
                        <span className="small-label">
                          {selectedRide ? "SELECTED ROUTE" : "CAMPUS LANDMARKS"}
                        </span>
                        <h3>
                          {place(selectedRide?.origin ?? "campus").short}{" "}
                          <span>to</span>{" "}
                          {
                            place(selectedRide?.destination ?? "shivajinagar")
                              .short
                          }
                        </h3>
                        <p>
                          Choose a ride to see its meeting point and cost
                          breakdown.
                        </p>
                        {selectedRide && (
                          <button
                            className="text-button"
                            onClick={() => showRide(selectedRide)}
                          >
                            See ride details
                          </button>
                        )}
                      </div>
                    </section>
                    <section className="community-note">
                      <Leaf size={23} />
                      <div>
                        <h3>One journey. Fewer empty seats.</h3>
                        <p>
                          Share a route you’re already taking. A small habit can
                          make campus commuting easier.
                        </p>
                      </div>
                    </section>
                    <section className="meet-note">
                      <ShieldCheck size={19} />
                      <div>
                        <h3>A little care goes a long way.</h3>
                        <p>
                          Meet in a public place. Check who you’re travelling
                          with. Share your plans with someone you trust.
                        </p>
                      </div>
                    </section>
                  </aside>
                </div>
              </>
            ) : view === "admin" && user.isAdmin ? (
              <AdminPanel />
            ) : (
              <section className="my-rides">
                <div className="my-rides-heading">
                  <div>
                    <p className="eyebrow">YOUR JOURNEYS</p>
                    <h1>My rides</h1>
                    <p className="muted">
                      Your joined rides and the seats you’ve offered.
                    </p>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => setModal({ kind: "offer" })}
                  >
                    <Plus size={17} />
                    Offer a ride
                  </button>
                </div>
                {!!state.schedules?.length && (
                  <section
                    className="schedule-section"
                    aria-label="Recurring commutes"
                  >
                    <h2>Recurring commutes</h2>
                    <div className="schedule-list">
                      {state.schedules.map((schedule) => (
                        <article className="schedule-card" key={schedule.id}>
                          <div>
                            <strong>
                              {place(schedule.origin).short} to{" "}
                              {place(schedule.destination).short}
                            </strong>
                            <p>
                              {schedule.weekdays
                                .map(
                                  (d) =>
                                    [
                                      "Sun",
                                      "Mon",
                                      "Tue",
                                      "Wed",
                                      "Thu",
                                      "Fri",
                                      "Sat",
                                    ][d],
                                )
                                .join(", ")}{" "}
                              · {schedule.localTime} IST
                            </p>
                            <small>
                              {schedule.startDate} to {schedule.endDate} ·{" "}
                              {schedule.active
                                ? schedule.endDate < indiaDate()
                                  ? "Ended"
                                  : "Active"
                                : "Stopped"}
                            </small>
                          </div>
                          {schedule.active &&
                            schedule.endDate >= indiaDate() && (
                              <button
                                className="text-button danger"
                                onClick={() =>
                                  setModal({
                                    kind: "stopSchedule",
                                    id: schedule.id,
                                  })
                                }
                              >
                                Stop schedule
                              </button>
                            )}
                        </article>
                      ))}
                    </div>
                  </section>
                )}
                <div className="filters">
                  <button
                    className={rideTab === "joined" ? "selected" : ""}
                    aria-pressed={rideTab === "joined"}
                    onClick={() => setRideTab("joined")}
                  >
                    <Ticket size={16} />
                    Joined rides ({myBookings.length})
                  </button>
                  <button
                    className={rideTab === "offered" ? "selected" : ""}
                    aria-pressed={rideTab === "offered"}
                    onClick={() => setRideTab("offered")}
                  >
                    <CarFront size={16} />
                    Offered rides ({myOffers.length})
                  </button>
                </div>
                {(
                  rideTab === "joined"
                    ? myBookings.length === 0
                    : myOffers.length === 0
                ) ? (
                  <div className="empty">
                    <Route size={36} />
                    <h3>
                      {rideTab === "joined"
                        ? "Your next shared journey starts here"
                        : "Have an empty seat?"}
                    </h3>
                    <p>
                      {rideTab === "joined"
                        ? "Find a campus ride and make your first booking."
                        : "Post your route and share the journey cost."}
                    </p>
                    <button
                      className="button primary"
                      onClick={() =>
                        rideTab === "joined"
                          ? setView("find")
                          : setModal({ kind: "offer" })
                      }
                    >
                      {rideTab === "joined" ? "Find a ride" : "Offer a ride"}
                    </button>
                  </div>
                ) : (
                  <div className="my-ride-list">
                    {rideTab === "joined"
                      ? myBookings.map((b) => {
                          const r = state.rides.find((r) => r.id === b.rideId);
                          if (!r) return null;
                          return (
                            <article className="my-ride-card" key={b.id}>
                              <div className="my-ride-top">
                                <span className={`booking-status ${b.status}`}>
                                  {b.status === "confirmed" ? (
                                    <Check size={14} />
                                  ) : (
                                    <X size={14} />
                                  )}{" "}
                                  {b.status === "confirmed"
                                    ? "Confirmed booking"
                                    : "Cancelled"}
                                </span>
                                <small>
                                  SC-{b.id.slice(0, 8).toUpperCase()}
                                </small>
                              </div>
                              <h3>
                                {place(r.origin).short} to{" "}
                                {place(r.destination).short}
                              </h3>
                              <p>
                                {dayLabel(r.departure)} ·{" "}
                                {timeLabel(r.departure)} IST · {r.host} ·{" "}
                                {b.seats} {b.seats === 1 ? "seat" : "seats"}
                              </p>
                              <div className="my-ride-bottom">
                                <span>
                                  {b.status === "confirmed" ? (
                                    <>
                                      <strong>
                                        {money(bookingShare(state, r, b))}
                                      </strong>{" "}
                                      current cost share
                                    </>
                                  ) : (
                                    "Your seats have been released."
                                  )}
                                </span>
                                <div>
                                  <button
                                    className="button small secondary"
                                    onClick={() => showRide(r)}
                                  >
                                    Details
                                  </button>
                                  {b.status === "confirmed" && (
                                    <button
                                      className="text-button danger"
                                      onClick={() =>
                                        setModal({
                                          kind: "cancel",
                                          bookingId: b.id,
                                        })
                                      }
                                    >
                                      Cancel booking
                                    </button>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })
                      : myOffers.map((r) => (
                          <article className="my-ride-card" key={r.id}>
                            <div className="my-ride-top">
                              <span
                                className={`booking-status ${r.status === "open" ? "confirmed" : "cancelled"}`}
                              >
                                {r.status === "open"
                                  ? new Date(r.departure).getTime() <=
                                    Date.now()
                                    ? "Departed"
                                    : "Open offer"
                                  : "Cancelled"}
                              </span>
                              <span className="type-badge">
                                {TYPE_LABELS[r.type]}
                              </span>
                            </div>
                            <h3>
                              {place(r.origin).short} to{" "}
                              {place(r.destination).short}
                            </h3>
                            <p>
                              {dayLabel(r.departure)} · {timeLabel(r.departure)}{" "}
                              IST · {r.vehicle}
                            </p>
                            <div className="my-ride-bottom">
                              <span>
                                {r.status === "open"
                                  ? `${availableSeats(state, r)} seats available · ${money(r.totalPaise)} total journey cost`
                                  : "This offer is no longer listed."}
                              </span>
                              <button
                                className="button small secondary"
                                onClick={() => showRide(r)}
                              >
                                Details & co-riders
                              </button>
                              {r.status === "open" && (
                                <button
                                  className="text-button danger"
                                  onClick={() =>
                                    setModal({ kind: "cancel", rideId: r.id })
                                  }
                                >
                                  Cancel offer
                                </button>
                              )}
                            </div>
                          </article>
                        ))}
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          <SignInPanel session={session} ready={ready} reload={reload} />
        )}
        <footer className="site-footer">
          <span>
            <Route size={17} />
            <strong>sharecommute</strong>
            <span>Made for the way campus moves.</span>
          </span>
          <button onClick={() => setModal({ kind: "help" })}>
            <CircleHelp size={15} />
            About ShareCommute
          </button>
        </footer>
      </main>
      {feedback && (
        <div
          className={`toast ${feedback.error ? "error" : ""}`}
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.error ? <Info size={19} /> : <Check size={19} />}
          <span>{feedback.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setFeedback(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal?.kind === "offer" && (
        <Modal
          title="Offer a campus ride"
          close={close}
          errorMessage={feedback?.error ? feedback.message : undefined}
          wide
        >
          <OfferForm
            close={close}
            submit={async (r) => {
              const ok = await commit(
                () => api.offer(r),
                "Ride offer posted. You can manage it in My rides.",
              );
              if (ok) {
                setView("rides");
                setRideTab("offered");
              }
              return ok;
            }}
          />
        </Modal>
      )}
      {modal?.kind === "ride" && modalRide && (
        <Modal
          title="Your shared journey"
          close={close}
          errorMessage={feedback?.error ? feedback.message : undefined}
        >
          <div className="detail-host">
            <span className="avatar avatar-0">{initials(modalRide.host)}</span>
            <div>
              <h3>{modalRide.host}</h3>
              <p>
                {modalRide.role} · {TYPE_LABELS[modalRide.type]}
              </p>
            </div>
            <span className="type-badge">
              {modalRide.sample
                ? "Sample member"
                : modalRide.ownerId === userId
                  ? "Your offer"
                  : "Campus member"}
            </span>
          </div>
          <div className="detail-route">
            <p>
              <MapPin size={18} />
              <strong>{place(modalRide.origin).name}</strong>
            </p>
            <p>
              <MapPin size={18} />
              <strong>{place(modalRide.destination).name}</strong>
            </p>
            <span>
              <CalendarDays size={16} />
              {dayLabel(modalRide.departure)}
              <Clock3 size={16} />
              {timeLabel(modalRide.departure)} IST
            </span>
          </div>
          <div className="meeting-point">
            <h3>Meeting point</h3>
            <p>
              {modalRide.note ||
                "Meet at the selected pickup point. Confirm the exact spot before travelling."}
            </p>
            <small>{modalRide.vehicle}</small>
            {modalRide.templateId && (
              <p className="recurring-label">Part of a recurring commute</p>
            )}
            {modalRide.hostEmail && (
              <div className="contact-card">
                <h3>Coordinate with your host</h3>
                <a href={`mailto:${modalRide.hostEmail}`}>
                  {modalRide.hostEmail}
                </a>
                <small>Visible only while your booking is confirmed.</small>
              </div>
            )}
            {!!modalRide.passengers?.length && (
              <div className="contact-card">
                <h3>Your confirmed co-riders</h3>
                {modalRide.passengers.map((person) => (
                  <p key={person.email}>
                    <strong>
                      {person.name} · {person.seats} seat(s)
                    </strong>
                    <a href={`mailto:${person.email}`}>{person.email}</a>
                  </p>
                ))}
              </div>
            )}
          </div>
          {(() => {
            const existing = state.bookings.find(
                (b) =>
                  b.rideId === modalRide.id &&
                  b.userId === userId &&
                  b.status === "confirmed",
              ),
              canBook =
                modalRide.status === "open" &&
                new Date(modalRide.departure).getTime() > Date.now() &&
                !existing &&
                modalRide.ownerId !== userId &&
                availableSeats(state, modalRide) > 0;
            const seats = canBook
                ? Math.min(bookSeats, availableSeats(state, modalRide))
                : 0,
              people = 1 + passengerSeats(state, modalRide) + seats;
            return (
              <>
                {canBook && (
                  <label className="detail-seats">
                    Seats to book
                    <select
                      aria-label="Seats to book"
                      value={seats}
                      onChange={(e) => setBookSeats(Number(e.target.value))}
                    >
                      {Array.from(
                        { length: availableSeats(state, modalRide) },
                        (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1} {i === 0 ? "seat" : "seats"}
                          </option>
                        ),
                      )}
                    </select>
                    <span>{availableSeats(state, modalRide)} available</span>
                  </label>
                )}
                <div className="fare-breakdown">
                  <h3>Simple, equal cost sharing</h3>
                  <div>
                    <span>Total journey cost</span>
                    <strong>{money(modalRide.totalPaise)}</strong>
                  </div>
                  <div>
                    <span>
                      Travellers {canBook ? "after you join" : "currently"}
                    </span>
                    <strong>{people}, including the host</strong>
                  </div>
                  <div>
                    <span>Each traveller’s share</span>
                    <strong>
                      {money(
                        splitFare(modalRide.totalPaise, people).at(-1) ?? 0,
                      )}
                      {modalRide.totalPaise % people !== 0
                        ? " – " +
                          money(splitFare(modalRide.totalPaise, people)[0])
                        : ""}
                    </strong>
                  </div>
                  <div className="fare-total">
                    <span>
                      {existing ? "Your current share" : "Your estimated share"}
                    </span>
                    <strong>
                      {money(
                        existing
                          ? bookingShare(state, modalRide, existing)
                          : canBook
                            ? quote(state, modalRide, seats)
                            : modalRide.ownerId === userId
                              ? splitFare(modalRide.totalPaise, people)[0]
                              : 0,
                      )}
                    </strong>
                  </div>
                  <p>
                    The cost is divided equally. It changes if travellers join
                    or cancel. ShareCommute records cost shares; payment is
                    arranged separately.
                  </p>
                </div>
                {existing ? (
                  <>
                    <p className="confirmed-message">
                      <Check size={18} />
                      You have {existing.seats}{" "}
                      {existing.seats === 1 ? "seat" : "seats"} on this ride.
                    </p>
                    <button
                      className="button secondary full"
                      onClick={() => {
                        setView("rides");
                        setRideTab("joined");
                        close();
                      }}
                    >
                      View in My rides
                    </button>
                  </>
                ) : canBook ? (
                  <button
                    className="button primary full"
                    disabled={pending}
                    onClick={async () => {
                      if (
                        await commit(
                          () =>
                            api.book(modalRide.id, seats, crypto.randomUUID()),
                          "Booking confirmed. Your seat is in My rides.",
                        )
                      ) {
                        setView("rides");
                        setRideTab("joined");
                        close();
                      }
                    }}
                  >
                    <Check size={18} />
                    Confirm booking
                  </button>
                ) : (
                  <p className="inline-note">
                    <Info size={16} />
                    {modalRide.status === "cancelled"
                      ? "This ride has been cancelled."
                      : modalRide.ownerId === userId
                        ? "You are the host of this ride."
                        : "This ride has departed or has no seats left."}
                  </p>
                )}
              </>
            );
          })()}
          {modalRide.ownerId !== userId && (
            <button
              className="text-button danger report-button"
              onClick={() => setModal({ kind: "report", rideId: modalRide.id })}
            >
              Report this ride
            </button>
          )}
          <p className="detail-disclaimer">
            {modalRide.sample
              ? "This is a fictional sample ride for testing. It does not arrange real travel."
              : "Confirm the meeting details with your co-riders before travelling."}
          </p>
        </Modal>
      )}
      {modal?.kind === "cancel" && (
        <Modal
          title={
            modal.bookingId ? "Cancel your booking?" : "Cancel your ride offer?"
          }
          close={close}
        >
          <p className="muted">
            {modal.bookingId
              ? "Your reserved seats will be released. You can book again if a seat is still available."
              : "The offer will be closed and associated bookings will be cancelled."}
          </p>
          <div className="confirm-actions">
            <button className="button secondary" onClick={close}>
              Keep it
            </button>
            <button
              className="button destructive"
              disabled={pending}
              onClick={async () => {
                const ok = modal.bookingId
                  ? await commit(
                      () => api.cancelBooking(modal.bookingId!),
                      "Booking cancelled. Your seats are available again.",
                    )
                  : await commit(
                      () => api.cancelOffer(modal.rideId!),
                      "Ride offer cancelled.",
                    );
                if (ok) close();
              }}
            >
              Yes, cancel
            </button>
          </div>
        </Modal>
      )}
      {modal?.kind === "report" && (
        <Modal title="Report a ride" close={close}>
          <ReportForm
            rideId={modal.rideId}
            done={() => {
              close();
              setFeedback({
                message: "Report submitted for administrator review.",
                error: false,
              });
            }}
          />
        </Modal>
      )}
      {modal?.kind === "stopSchedule" && (
        <Modal
          title="Stop this recurring commute?"
          close={close}
          errorMessage={feedback?.error ? feedback.message : undefined}
        >
          <p className="muted">
            This stops the schedule and cancels all its future ride offers and
            bookings. Past rides stay in your history.
          </p>
          <div className="confirm-actions">
            <button
              className="button secondary"
              onClick={close}
              disabled={pending}
            >
              Keep schedule
            </button>
            <button
              className="button destructive"
              disabled={pending}
              onClick={async () => {
                if (
                  await commit(
                    () => api.stopSchedule(modal.id),
                    "Recurring commute stopped.",
                  )
                )
                  close();
              }}
            >
              Stop future rides
            </button>
          </div>
        </Modal>
      )}
      {modal?.kind === "help" && (
        <Modal title="A better way to share your commute" close={close}>
          <div className="how-step">
            <span>01</span>
            <div>
              <h3>Find your route</h3>
              <p>
                Choose your pickup point, destination, travel date and departure
                window. Compare the matching rides.
              </p>
            </div>
          </div>
          <div className="how-step">
            <span>02</span>
            <div>
              <h3>Share an empty seat</h3>
              <p>
                Review the host, meeting point and cost. Reserve your seats, or
                offer a journey you’re already taking.
              </p>
            </div>
          </div>
          <div className="how-step">
            <span>03</span>
            <div>
              <h3>Split the journey cost</h3>
              <p>
                The cost is divided across the host and passengers. My rides
                shows your current share and lets you cancel.
              </p>
            </div>
          </div>
          <div className="help-demo">
            <h3>About ShareCommute</h3>
            <p>
              Accounts, offers and bookings are saved in a shared SQLite
              database on this computer. Booking and cancellation rules are
              enforced by the local server.
            </p>
            <p>
              {session.mailMode === "development"
                ? "Development email mode shows test codes locally and does not verify email ownership. Resend verification is available once the Resend settings are configured."
                : "Sign-in codes are delivered through the configured Resend provider."}
            </p>
            <p>
              Sample rides are fictional and labelled. Recurring commutes and
              administration are the next Phase 2 additions. The route diagram
              is a landmark schematic, not live navigation.
            </p>
            <p>
              Inspired by Quick Ride’s find-and-offer approach. ShareCommute is
              an independent academic project.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
