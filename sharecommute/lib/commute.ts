/** Pure business rules. All currency values are integer paise. */
export const PLACES = [
  {
    id: "campus",
    name: "MIT-WPU Main Gate",
    short: "MIT-WPU",
    area: "Kothrud",
    x: 92,
    y: 194,
  },
  {
    id: "deccan",
    name: "Deccan Gymkhana",
    short: "Deccan",
    area: "Pune",
    x: 190,
    y: 137,
  },
  {
    id: "shivajinagar",
    name: "Shivajinagar Station",
    short: "Shivajinagar",
    area: "Pune",
    x: 225,
    y: 73,
  },
  {
    id: "warje",
    name: "Warje Bridge",
    short: "Warje",
    area: "Pune",
    x: 68,
    y: 275,
  },
  {
    id: "baner",
    name: "Baner Road",
    short: "Baner",
    area: "Pune",
    x: 90,
    y: 53,
  },
  {
    id: "swargate",
    name: "Swargate Bus Stand",
    short: "Swargate",
    area: "Pune",
    x: 264,
    y: 259,
  },
  {
    id: "station",
    name: "Pune Railway Station",
    short: "Pune Station",
    area: "Pune",
    x: 280,
    y: 124,
  },
] as const;
export type PlaceId = (typeof PLACES)[number]["id"];
export type RideType = "carpool" | "cab" | "bike";
export type Ride = {
  id: string;
  ownerId: string;
  host: string;
  role: "Student" | "Faculty";
  department: string;
  origin: PlaceId;
  destination: PlaceId;
  departure: string;
  type: RideType;
  vehicle: string;
  capacity: number;
  otherPassengers: number;
  totalPaise: number;
  note: string;
  status: "open" | "cancelled";
  sample: boolean;
};
export type Booking = {
  id: string;
  rideId: string;
  userId: string;
  seats: number;
  status: "confirmed" | "cancelled";
  createdAt: string;
};
export type CommuteState = { version: 1; rides: Ride[]; bookings: Booking[] };
export type Search = {
  origin: string;
  destination: string;
  date: string;
  time: string;
  window: number;
  seats: number;
};
export const DEMO_USER = "demo-student";
export const TYPE_LABELS: Record<RideType, string> = {
  carpool: "Carpool",
  cab: "Cab split",
  bike: "Bikepool",
};
export const place = (id: string) =>
  PLACES.find((p) => p.id === id) ?? PLACES[0];
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100);
export const indiaDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const tomorrow = (now = new Date()) =>
  indiaDate(new Date(now.getTime() + 86_400_000));
export const departureAt = (date: string, time: string) =>
  `${date}T${time}:00+05:30`;
export const timeLabel = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
export const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  }).format(new Date(date));
export function passengerSeats(state: CommuteState, ride: Ride) {
  return (
    ride.otherPassengers +
    state.bookings
      .filter((b) => b.rideId === ride.id && b.status === "confirmed")
      .reduce((n, b) => n + b.seats, 0)
  );
}
export const availableSeats = (state: CommuteState, ride: Ride) =>
  Math.max(0, ride.capacity - 1 - passengerSeats(state, ride));
/** Assign leftover paise to the first participants so shares sum exactly. */
export function splitFare(totalPaise: number, people: number): number[] {
  if (
    !Number.isSafeInteger(totalPaise) ||
    totalPaise < 0 ||
    !Number.isInteger(people) ||
    people < 1 ||
    people > 7
  )
    throw new Error("Invalid fare or traveller count.");
  const base = Math.floor(totalPaise / people);
  return Array.from(
    { length: people },
    (_, i) => base + (i < totalPaise % people ? 1 : 0),
  );
}
export function quote(state: CommuteState, ride: Ride, seats = 1) {
  return splitFare(ride.totalPaise, 1 + passengerSeats(state, ride) + seats)
    .slice(-seats)
    .reduce((a, b) => a + b, 0);
}
export function bookingShare(
  state: CommuteState,
  ride: Ride,
  booking: Booking,
) {
  const active = state.bookings.filter(
    (b) => b.rideId === ride.id && b.status === "confirmed",
  );
  const before = active
    .slice(
      0,
      active.findIndex((b) => b.id === booking.id),
    )
    .reduce((n, b) => n + b.seats, 0);
  return splitFare(ride.totalPaise, 1 + passengerSeats(state, ride))
    .slice(
      1 + ride.otherPassengers + before,
      1 + ride.otherPassengers + before + booking.seats,
    )
    .reduce((a, b) => a + b, 0);
}
export function findRides(
  state: CommuteState,
  search: Search,
  now = Date.now(),
) {
  const target = new Date(departureAt(search.date, search.time)).getTime();
  return state.rides.filter(
    (r) =>
      r.status === "open" &&
      new Date(r.departure).getTime() > now &&
      r.ownerId !== DEMO_USER &&
      (!search.origin || r.origin === search.origin) &&
      (!search.destination || r.destination === search.destination) &&
      indiaDate(new Date(r.departure)) === search.date &&
      availableSeats(state, r) >= search.seats &&
      (search.window === 0 ||
        Math.abs(new Date(r.departure).getTime() - target) <=
          search.window * 60_000),
  );
}
export function reserve(
  state: CommuteState,
  rideId: string,
  seats: number,
  id: string,
  now = Date.now(),
): CommuteState {
  const ride = state.rides.find((r) => r.id === rideId);
  if (
    !ride ||
    ride.status !== "open" ||
    new Date(ride.departure).getTime() <= now
  )
    throw new Error("This ride is no longer available.");
  if (ride.ownerId === DEMO_USER)
    throw new Error("You cannot book your own ride.");
  if (
    state.bookings.some(
      (b) =>
        b.rideId === rideId &&
        b.userId === DEMO_USER &&
        b.status === "confirmed",
    )
  )
    throw new Error("You already have a booking for this ride.");
  if (
    !Number.isInteger(seats) ||
    seats < 1 ||
    seats > availableSeats(state, ride)
  )
    throw new Error("There are not enough seats left. Choose another ride.");
  return {
    ...state,
    bookings: [
      ...state.bookings,
      {
        id,
        rideId,
        seats,
        userId: DEMO_USER,
        status: "confirmed",
        createdAt: new Date(now).toISOString(),
      },
    ],
  };
}
export function cancelBooking(
  state: CommuteState,
  bookingId: string,
): CommuteState {
  const booking = state.bookings.find(
    (b) => b.id === bookingId && b.userId === DEMO_USER,
  );
  if (!booking || booking.status !== "confirmed")
    throw new Error("This booking is already cancelled or unavailable.");
  return {
    ...state,
    bookings: state.bookings.map((b) =>
      b.id === bookingId ? { ...b, status: "cancelled" } : b,
    ),
  };
}
export function cancelOffer(state: CommuteState, rideId: string): CommuteState {
  const ride = state.rides.find(
    (r) => r.id === rideId && r.ownerId === DEMO_USER,
  );
  if (!ride || ride.status !== "open")
    throw new Error("You can only cancel your own open ride.");
  return {
    ...state,
    rides: state.rides.map((r) =>
      r.id === rideId ? { ...r, status: "cancelled" } : r,
    ),
    bookings: state.bookings.map((b) =>
      b.rideId === rideId ? { ...b, status: "cancelled" } : b,
    ),
  };
}
export function addOffer(
  state: CommuteState,
  ride: Ride,
  now = Date.now(),
): CommuteState {
  if (
    !PLACES.some((p) => p.id === ride.origin) ||
    !PLACES.some((p) => p.id === ride.destination) ||
    ride.origin === ride.destination
  )
    throw new Error("Choose two different pickup and drop-off points.");
  if (
    !Number.isFinite(new Date(ride.departure).getTime()) ||
    new Date(ride.departure).getTime() <= now
  )
    throw new Error("Choose a departure time in the future.");
  const max = ride.type === "bike" ? 2 : ride.type === "cab" ? 7 : 5;
  if (
    !Number.isInteger(ride.capacity) ||
    ride.capacity < 2 ||
    ride.capacity > max
  )
    throw new Error(`This vehicle supports 2–${max} travellers including you.`);
  if (
    !Number.isSafeInteger(ride.totalPaise) ||
    ride.totalPaise < 0 ||
    ride.totalPaise > 500_000
  )
    throw new Error("Enter a total journey cost between ₹0 and ₹5,000.");
  if (
    ride.ownerId !== DEMO_USER ||
    ride.otherPassengers !== 0 ||
    ride.status !== "open" ||
    ride.sample
  )
    throw new Error("Invalid ride offer.");
  if (
    !ride.vehicle.trim() ||
    ride.vehicle.length > 50 ||
    ride.note.length > 180
  )
    throw new Error(
      "Add a short vehicle description and a note under 180 characters.",
    );
  return { ...state, rides: [ride, ...state.rides] };
}
export function initialState(now = new Date()): CommuteState {
  const date = tomorrow(now);
  const sample = (
    id: string,
    host: string,
    destination: PlaceId,
    time: string,
    type: RideType,
    vehicle: string,
    capacity: number,
    otherPassengers: number,
    totalPaise: number,
    role: Ride["role"] = "Student",
  ): Ride => ({
    id,
    host,
    destination,
    type,
    vehicle,
    capacity,
    otherPassengers,
    totalPaise,
    role,
    ownerId: `sample-${id}`,
    department:
      role === "Faculty" ? "School of Engineering" : "MIT-WPU student",
    origin: "campus",
    departure: departureAt(date, time),
    status: "open",
    sample: true,
    note: "Meet outside the main gate, near the security cabin. Please arrive 5 minutes early.",
  });
  return {
    version: 1,
    bookings: [],
    rides: [
      sample(
        "sample-avani",
        "Avani Deshmukh",
        "shivajinagar",
        "17:00",
        "carpool",
        "Maruti Swift · AC",
        4,
        1,
        18000,
      ),
      sample(
        "sample-rohan",
        "Rohan Kulkarni",
        "deccan",
        "17:15",
        "cab",
        "Shared cab · AC",
        4,
        1,
        15000,
      ),
      sample(
        "sample-neha",
        "Neha Patil",
        "baner",
        "17:30",
        "carpool",
        "Honda City · AC",
        5,
        2,
        32000,
        "Faculty",
      ),
      sample(
        "sample-aryan",
        "Aryan Shah",
        "warje",
        "16:45",
        "bike",
        "Honda Activa · Bring a helmet",
        2,
        0,
        6000,
      ),
      sample(
        "sample-sana",
        "Sana Shaikh",
        "swargate",
        "17:45",
        "cab",
        "Shared cab · AC",
        4,
        0,
        24000,
      ),
      sample(
        "sample-kunal",
        "Kunal Joshi",
        "station",
        "18:00",
        "carpool",
        "Tata Nexon · AC",
        5,
        1,
        27000,
      ),
    ],
  };
}
