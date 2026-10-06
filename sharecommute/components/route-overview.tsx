import { place, type Ride } from "@/lib/commute";
/** Landmark diagram, not a navigational map or calculated road route. */
export default function RouteOverview({ ride }: { ride?: Ride }) {
  const a = place(ride?.origin ?? "campus"),
    b = place(ride?.destination ?? "shivajinagar");
  return (
    <div className="route-map">
      <svg
        viewBox="0 0 340 310"
        role="img"
        aria-label={`Landmark schematic between ${a.name} and ${b.name}. Not for navigation.`}
      >
        <defs>
          <pattern
            id="map-grid"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M32 0H0V32"
              fill="none"
              stroke="#dce6df"
              strokeWidth=".8"
            />
          </pattern>
        </defs>
        <rect width="340" height="310" fill="#edf2ed" />
        <rect width="340" height="310" fill="url(#map-grid)" />
        <path
          d="M-10 102C87 91 112 118 177 106S270 101 355 57"
          fill="none"
          stroke="#c9e0e6"
          strokeWidth="13"
        />
        <g fill="none" stroke="white" strokeWidth="10">
          <path d="M20 40L118 123L103 201L53 314" />
          <path d="M0 244L105 196L214 162L350 173" />
          <path d="M79 0L133 92L201 140L240 237L311 310" />
          <path d="M209 0L224 85L289 125L341 108" />
          <path d="M0 147L81 136L134 91L342 31" />
          <path d="M4 286L101 258L271 260L337 232" />
        </g>
        <g fill="none" stroke="#d1dbd3">
          <path d="M20 40L118 123L103 201L53 314" />
          <path d="M0 244L105 196L214 162L350 173" />
          <path d="M79 0L133 92L201 140L240 237L311 310" />
        </g>
        <g fill="#d0e3c8">
          <rect x="12" y="163" width="43" height="40" rx="8" />
          <rect x="163" y="216" width="41" height="58" rx="8" />
        </g>
        <g fontFamily="Arial,sans-serif" fontSize="10" fill="#778878">
          <text x="31" y="84">
            KOTHRUD
          </text>
          <text x="145" y="167">
            DECCAN
          </text>
          <text x="210" y="35">
            SHIVAJINAGAR
          </text>
          <text x="197" y="288">
            SWARGATE
          </text>
          <text x="54" y="297">
            WARJE
          </text>
          <text x="277" y="149">
            PUNE STATION
          </text>
          <text x="61" y="30">
            BANER
          </text>
        </g>
        <path
          d={`M${a.x} ${a.y} Q${a.x + 48} ${a.y - 15} ${(a.x + b.x) / 2} ${(a.y + b.y) / 2} T${b.x} ${b.y}`}
          fill="none"
          stroke="white"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d={`M${a.x} ${a.y} Q${a.x + 48} ${a.y - 15} ${(a.x + b.x) / 2} ${(a.y + b.y) / 2} T${b.x} ${b.y}`}
          fill="none"
          stroke="#087653"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx={a.x}
          cy={a.y}
          r="10"
          fill="#087653"
          stroke="white"
          strokeWidth="3"
        />
        <circle cx={a.x} cy={a.y} r="3" fill="white" />
        <circle
          cx={b.x}
          cy={b.y}
          r="9"
          fill="#c8e899"
          stroke="#076b4d"
          strokeWidth="3"
        />
        <g transform={`translate(${Math.min(a.x - 44, 220)} ${a.y + 17})`}>
          <rect width="103" height="25" rx="6" fill="white" />
          <text x="8" y="16" fontSize="11" fontWeight="600" fill="#17392b">
            {a.short}
          </text>
        </g>
        <g transform={`translate(${Math.min(b.x - 40, 220)} ${b.y - 38})`}>
          <rect width="110" height="25" rx="6" fill="white" />
          <text x="8" y="16" fontSize="11" fontWeight="600" fill="#17392b">
            {b.short}
          </text>
        </g>
      </svg>
      <span className="map-caption">
        Landmark schematic · not for navigation
      </span>
    </div>
  );
}
