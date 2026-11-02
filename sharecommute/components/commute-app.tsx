"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Route,
  MapPin,
  CalendarDays,
  Clock3,
  CarFront,
  Bike,
  Users,
  Plus,
  X,
  Check,
  Info,
  Ticket,
  RotateCcw,
  GraduationCap,
  CircleHelp,
  LogOut,
} from "lucide-react";
import Modal from "./commute-modal";
import RideExplorer from "./ride-explorer";
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
  place,
  quote,
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
import BookingReview, { BookingReviewFooter } from "./booking-review";
import BookingTicket from "./booking-ticket";
import RideReservationBar from "./ride-reservation-bar";
import {
  bookingPreview,
  bookingReference,
  confirmedBooking,
} from "@/lib/booking-view";

const iconFor = (type: RideType) => (type === "bike" ? Bike : CarFront);
const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
type ModalState =
  | { kind: "ride"; rideId: string }
  | { kind: "review"; rideId: string }
  | { kind: "ticket"; bookingId: string }
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
  const bookingAttempt = useRef<{
    rideId: string;
    seats: number;
    key: string;
  } | null>(null);
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
  const selectedRide = matches.find((r) => r.id === selected) ?? matches[0];
  const modalRide =
    modal?.kind === "ride"
      ? state.rides.find((r) => r.id === modal.rideId)
      : undefined;
  const reviewRide =
    modal?.kind === "review"
      ? state.rides.find((ride) => ride.id === modal.rideId)
      : undefined;
  const ticketBooking =
    modal?.kind === "ticket"
      ? state.bookings.find(
          (booking) =>
            booking.id === modal.bookingId && booking.userId === userId,
        )
      : undefined;
  const ticketRide = ticketBooking
    ? state.rides.find((ride) => ride.id === ticketBooking.rideId)
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
  async function reserveRide(ride: Ride) {
    const preview = bookingPreview(state, ride, bookSeats, userId);
    if (!preview.canConfirm) {
      setFeedback({ message: preview.reason, error: true });
      return;
    }
    const previous = bookingAttempt.current;
    const attempt =
      previous?.rideId === ride.id && previous.seats === bookSeats
        ? previous
        : { rideId: ride.id, seats: bookSeats, key: crypto.randomUUID() };
    bookingAttempt.current = attempt;
    let receiptId = "";
    const ok = await commit(async () => {
      const result = await api.book(ride.id, bookSeats, attempt.key);
      try {
        confirmedBooking(result.state, result.id, ride.id, userId, bookSeats);
      } catch (error) {
        bookingAttempt.current = null;
        throw error;
      }
      receiptId = result.id;
      return result;
    }, "Booking confirmed.");
    if (ok && receiptId) {
      bookingAttempt.current = null;
      setFeedback(null);
      setModal({ kind: "ticket", bookingId: receiptId });
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header
        className={`site-header ${user && view === "find" ? "explore-header" : ""}`}
      >
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
      <main
        id="main"
        className={`main-container ${user && view === "find" ? "explore-main" : ""}`}
      >
        <div className="demo-strip">
          <span>
            <span className="demo-tag">LOCAL</span>
            {user ? (
              <>{user.name} · Email verified</>
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
              <RideExplorer
                state={state}
                userId={userId}
                ready={ready}
                draft={draft}
                search={search}
                matches={matches}
                filter={filter}
                sort={sort}
                selectedRide={selectedRide}
                onDraftChange={setDraft}
                onSearch={doSearch}
                onFilter={(value) => {
                  setFilter(value);
                  setSelected(null);
                }}
                onSort={setSort}
                onSelect={setSelected}
                onOpen={showRide}
                onReset={() => {
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
                  setSelected(null);
                  setFilter("all");
                }}
              />
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
                                <small>{bookingReference(b.id)}</small>
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
                                    onClick={() =>
                                      b.status === "confirmed"
                                        ? setModal({
                                            kind: "ticket",
                                            bookingId: b.id,
                                          })
                                        : showRide(r)
                                    }
                                  >
                                    {b.status === "confirmed"
                                      ? "View booking"
                                      : "Details"}
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
      {modal?.kind === "review" && reviewRide && user && (
        <Modal
          title="Review your booking"
          close={close}
          busy={pending}
          errorMessage={feedback?.error ? feedback.message : undefined}
          footer={
            <BookingReviewFooter
              state={state}
              ride={reviewRide}
              userId={userId}
              seats={bookSeats}
              pending={pending}
              onConfirm={() => reserveRide(reviewRide)}
              onBack={() => {
                setFeedback(null);
                setModal({ kind: "ride", rideId: reviewRide.id });
              }}
              onExisting={(id) => setModal({ kind: "ticket", bookingId: id })}
            />
          }
        >
          <BookingReview
            state={state}
            ride={reviewRide}
            userId={userId}
            seats={bookSeats}
            pending={pending}
            onSeatsChange={setBookSeats}
            onRefresh={async () => {
              const result = await api.state();
              apply(result.state);
              setFeedback(null);
            }}
          />
        </Modal>
      )}
      {modal?.kind === "ticket" && ticketBooking && ticketRide && (
        <Modal title="Your booking" close={close} wide>
          <BookingTicket
            booking={ticketBooking}
            ride={ticketRide}
            state={state}
            onDetails={() => showRide(ticketRide)}
            onRides={() => {
              setView("rides");
              setRideTab("joined");
              close();
            }}
          />
        </Modal>
      )}
      {modal?.kind === "ride" && modalRide && (
        <Modal
          title="Your shared journey"
          close={close}
          errorMessage={feedback?.error ? feedback.message : undefined}
          footer={
            <RideReservationBar
              state={state}
              ride={modalRide}
              userId={userId}
              seats={bookSeats}
              pending={pending}
              onSeatsChange={setBookSeats}
              onReview={() => {
                setFeedback(null);
                setModal({ kind: "review", rideId: modalRide.id });
              }}
              onBooking={(id) => setModal({ kind: "ticket", bookingId: id })}
            />
          }
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
          <RouteOverview ride={modalRide} compact />
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
            <p>Sign-in requires a code delivered to your college email.</p>
            <p>
              Sample rides are fictional and labelled. Google Maps shows a
              suggested road route, distance and estimated driving time. Confirm
              the meeting point with your host before travelling.
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
