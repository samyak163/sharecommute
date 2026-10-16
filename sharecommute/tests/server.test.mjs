import test from "node:test";
import { request as httpRequest } from "node:http";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import { openDatabase } from "../server/database.ts";
import { createAuth } from "../server/auth.ts";
import { createApp } from "../server/app.ts";
import { createRideService } from "../server/rides.ts";
import { availableSeats } from "../lib/commute.ts";

const origin = "http://127.0.0.1:5173";
const developmentMailer = { mode: "development", async sendCode() {} };
const baseOptions = {
  secret: "test-only-secret",
  domains: ["mitwpu.edu.in"],
  mailer: developmentMailer,
  origins: [origin],
  authRequestLimit: 100,
  authCooldownMs: 0,
};
const profile = (name) => ({
  name: `${name} Tester`,
  email: `${name.toLowerCase()}@mitwpu.edu.in`,
  role: "Student",
});
const offer = () => ({
  origin: "campus",
  destination: "deccan",
  departure: new Date(Date.now() + 86400000).toISOString(),
  type: "bike",
  vehicle: "Test bike",
  capacity: 2,
  totalPaise: 10001,
  note: "Main gate",
});

async function fixture(t, options = {}) {
  const db = openDatabase(":memory:");
  const app = createApp(db, { ...baseOptions, ...options });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${app.server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => app.server.close(resolve));
    db.close();
  });
  async function call(path, { body, cookie, headers = {} } = {}) {
    const response = await fetch(url + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body === undefined
          ? {}
          : { "Content-Type": "application/json", Origin: origin }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      cookieHeader: response.headers.get("set-cookie"),
    };
  }
  async function login(name) {
    const challenge = await call("/api/auth/request-code", {
      body: profile(name),
    });
    assert.equal(challenge.status, 200);
    const signed = await call("/api/auth/verify", {
      body: {
        challengeId: challenge.data.challengeId,
        code: challenge.data.developmentCode,
      },
    });
    assert.equal(signed.status, 200);
    return {
      user: signed.data.user,
      cookie: signed.cookie,
      challenge: challenge.data,
    };
  }
  return { db, app, call, login, url };
}

test("private APIs reject anonymous access and writes reject untrusted origins", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.call("/api/state")).status, 401);
  assert.equal(
    (
      await f.call("/api/auth/request-code", {
        body: profile("Alex"),
        headers: { Origin: "https://untrusted.example" },
      })
    ).status,
    403,
  );
  const hostStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(
      f.url + "/api/session",
      { headers: { Host: "attacker.example" } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(hostStatus, 403);
  assert.equal(
    (
      await f.call("/api/auth/request-code", {
        body: { ...profile("Alex"), email: "alex@mitwpu.edu.in.evil.example" },
      })
    ).status,
    400,
  );
});

test("code exchange issues an HttpOnly session, rejects replay and supports logout", async (t) => {
  const f = await fixture(t);
  const code = await f.call("/api/auth/request-code", {
    body: profile("Alex"),
  });
  const challenge = f.db
    .prepare("SELECT code_hash FROM login_challenges WHERE id = ?")
    .get(code.data.challengeId);
  assert.notEqual(challenge.code_hash, code.data.developmentCode);
  const response = await f.call("/api/auth/verify", {
    body: {
      challengeId: code.data.challengeId,
      code: code.data.developmentCode,
    },
  });
  assert.equal(response.status, 200);
  assert.match(response.cookieHeader, /HttpOnly/);
  assert.match(response.cookieHeader, /SameSite=Strict/);
  assert.equal(response.data.token, undefined);
  assert.equal(response.data.user.verification, "development");
  assert.equal(
    (await f.call("/api/session", { cookie: response.cookie })).data.user.email,
    "alex@mitwpu.edu.in",
  );
  assert.equal(
    (
      await f.call("/api/auth/verify", {
        body: {
          challengeId: code.data.challengeId,
          code: code.data.developmentCode,
        },
      })
    ).status,
    400,
  );
  await f.call("/api/auth/logout", { body: {}, cookie: response.cookie });
  assert.equal(
    (await f.call("/api/state", { cookie: response.cookie })).status,
    401,
  );
});

test("wrong attempts are persisted and expired codes and sessions are rejected", async (t) => {
  const db = openDatabase(":memory:");
  t.after(() => db.close());
  let now = Date.now();
  const auth = createAuth(db, {
    secret: "test",
    domains: ["mitwpu.edu.in"],
    mailer: developmentMailer,
    now: () => now,
    cooldownMs: 0,
  });
  const c = await auth.requestCode(profile("Alex"), "local");
  const wrong = c.developmentCode === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++)
    assert.throws(() =>
      auth.verify({ challengeId: c.challengeId, code: wrong }),
    );
  assert.equal(
    db
      .prepare("SELECT attempts FROM login_challenges WHERE id = ?")
      .get(c.challengeId).attempts,
    5,
  );
  assert.throws(() =>
    auth.verify({ challengeId: c.challengeId, code: c.developmentCode }),
  );
  const expired = await auth.requestCode(profile("Blair"), "local");
  now += 600001;
  assert.throws(() =>
    auth.verify({
      challengeId: expired.challengeId,
      code: expired.developmentCode,
    }),
  );
  const valid = await auth.requestCode(profile("Casey"), "local");
  const signed = auth.verify({
    challengeId: valid.challengeId,
    code: valid.developmentCode,
  });
  assert.ok(auth.session(signed.token));
  now += 7 * 86400000 + 1;
  assert.equal(auth.session(signed.token), null);
});

test("login requests enforce cooldowns and rate limits", async (t) => {
  const db = openDatabase(":memory:");
  t.after(() => db.close());
  const auth = createAuth(db, {
    secret: "test",
    domains: ["mitwpu.edu.in"],
    mailer: developmentMailer,
    requestLimit: 2,
  });
  await auth.requestCode(profile("Alex"), "same-ip");
  await assert.rejects(
    auth.requestCode(profile("Alex"), "same-ip"),
    /wait one minute/,
  );
  await auth.requestCode(profile("Blair"), "same-ip");
  await assert.rejects(
    auth.requestCode(profile("Casey"), "same-ip"),
    /Too many/,
  );
});

test("two accounts see shared offers while owner fields and cancellations are authorised", async (t) => {
  const f = await fixture(t),
    a = await f.login("Alex"),
    b = await f.login("Blair");
  const created = await f.call("/api/rides", {
    cookie: a.cookie,
    body: { ...offer(), ownerId: b.user.id, sample: true, otherPassengers: 6 },
  });
  assert.equal(created.status, 201);
  const seen = (await f.call("/api/state", { cookie: b.cookie })).data.state;
  assert.equal(seen.rides[0].ownerId, a.user.id);
  assert.equal(seen.rides[0].sample, false);
  assert.equal(seen.rides[0].otherPassengers, 0);
  assert.equal(
    (
      await f.call(`/api/rides/${created.data.id}/cancel`, {
        cookie: b.cookie,
        body: {},
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await f.call("/api/rides", {
        cookie: a.cookie,
        body: { ...offer(), destination: "campus" },
      })
    ).status,
    400,
  );
});

test("simultaneous last-seat requests produce one booking and one conflict; retry is idempotent", async (t) => {
  const f = await fixture(t),
    host = await f.login("Host"),
    a = await f.login("Alex"),
    b = await f.login("Blair");
  const ride = (
    await f.call("/api/rides", { cookie: host.cookie, body: offer() })
  ).data;
  const ka = randomUUID(),
    kb = randomUUID();
  const [ra, rb] = await Promise.all([
    f.call(`/api/rides/${ride.id}/bookings`, {
      cookie: a.cookie,
      body: { seats: 1, idempotencyKey: ka },
    }),
    f.call(`/api/rides/${ride.id}/bookings`, {
      cookie: b.cookie,
      body: { seats: 1, idempotencyKey: kb },
    }),
  ]);
  assert.deepEqual([ra.status, rb.status].sort(), [200, 409]);
  const winner = ra.status === 200 ? a : b,
    key = ra.status === 200 ? ka : kb,
    result = ra.status === 200 ? ra : rb;
  const replay = await f.call(`/api/rides/${ride.id}/bookings`, {
    cookie: winner.cookie,
    body: { seats: 1, idempotencyKey: key },
  });
  assert.equal(replay.data.id, result.data.id);
  assert.equal(
    f.db
      .prepare("SELECT COUNT(*) AS n FROM bookings WHERE status='confirmed'")
      .get().n,
    1,
  );
  const snapshot = (await f.call("/api/state", { cookie: host.cookie })).data
    .state;
  assert.equal(snapshot.bookings.length, 0);
  assert.equal(availableSeats(snapshot, snapshot.rides[0]), 0);
  assert.equal(
    (
      await f.call(`/api/bookings/${result.data.id}/cancel`, {
        cookie: host.cookie,
        body: {},
      })
    ).status,
    404,
  );
  await f.call(`/api/bookings/${result.data.id}/cancel`, {
    cookie: winner.cookie,
    body: {},
  });
  await f.call(`/api/bookings/${result.data.id}/cancel`, {
    cookie: winner.cookie,
    body: {},
  });
  const after = (await f.call("/api/state", { cookie: host.cookie })).data
    .state;
  assert.equal(availableSeats(after, after.rides[0]), 1);
});

test("server fare allocations conserve paise across users and host cancellation closes bookings", async (t) => {
  const f = await fixture(t),
    host = await f.login("Host"),
    a = await f.login("Alex"),
    b = await f.login("Blair");
  const r = (
    await f.call("/api/rides", {
      cookie: host.cookie,
      body: { ...offer(), type: "carpool", capacity: 3, totalPaise: 10000 },
    })
  ).data;
  await f.call(`/api/rides/${r.id}/bookings`, {
    cookie: a.cookie,
    body: { seats: 1, idempotencyKey: randomUUID() },
  });
  await f.call(`/api/rides/${r.id}/bookings`, {
    cookie: b.cookie,
    body: { seats: 1, idempotencyKey: randomUUID() },
  });
  const sa = (await f.call("/api/state", { cookie: a.cookie })).data.state,
    sb = (await f.call("/api/state", { cookie: b.cookie })).data.state;
  assert.equal(sa.bookings.length, 1);
  assert.equal(sb.bookings.length, 1);
  assert.equal(sa.bookings[0].sharePaise, 3333);
  assert.equal(sb.bookings[0].sharePaise, 3333);
  assert.equal(
    sa.bookings[0].sharePaise + sb.bookings[0].sharePaise + 3334,
    10000,
  );
  await f.call(`/api/rides/${r.id}/cancel`, { cookie: host.cookie, body: {} });
  assert.equal(
    (await f.call("/api/state", { cookie: a.cookie })).data.state.bookings[0]
      .status,
    "cancelled",
  );
  assert.equal(
    (
      await f.call(`/api/rides/${r.id}/bookings`, {
        cookie: a.cookie,
        body: { seats: 1, idempotencyKey: randomUUID() },
      })
    ).status,
    409,
  );
});

test("database trigger rejects capacity violations outside the HTTP service", async (t) => {
  const f = await fixture(t),
    host = await f.login("Host"),
    a = await f.login("Alex"),
    b = await f.login("Blair");
  const r = (await f.call("/api/rides", { cookie: host.cookie, body: offer() }))
    .data;
  await f.call(`/api/rides/${r.id}/bookings`, {
    cookie: a.cookie,
    body: { seats: 1, idempotencyKey: randomUUID() },
  });
  assert.throws(
    () =>
      f.db
        .prepare(
          "INSERT INTO bookings(id,ride_id,user_id,seats,status,idempotency_key,created_at) VALUES(?,?,?,1,'confirmed',?,?)",
        )
        .run(randomUUID(), r.id, b.user.id, randomUUID(), Date.now()),
    /not_enough_seats/,
  );
});

test("email transport never returns the code and failed delivery invalidates the challenge", async (t) => {
  const db = openDatabase(":memory:");
  t.after(() => db.close());
  let delivered;
  const auth = createAuth(db, {
    secret: "test",
    domains: ["mitwpu.edu.in"],
    mailer: {
      mode: "resend",
      async sendCode(email, code) {
        delivered = code;
      },
    },
  });
  const c = await auth.requestCode(profile("Alex"), "local");
  assert.equal(c.developmentCode, undefined);
  const user = auth.verify({
    challengeId: c.challengeId,
    code: delivered,
  }).user;
  assert.equal(user.verification, "email");
  const broken = createAuth(db, {
    secret: "test",
    domains: ["mitwpu.edu.in"],
    mailer: {
      mode: "resend",
      async sendCode() {
        throw new Error("provider failure");
      },
    },
  });
  await assert.rejects(
    broken.requestCode(profile("Blair"), "local"),
    /could not be sent/,
  );
  assert.equal(
    db
      .prepare("SELECT consumed FROM login_challenges WHERE email=?")
      .get("blair@mitwpu.edu.in").consumed,
    1,
  );
});

test("SQLite retains records across database restart and migrations do not duplicate", () => {
  const root = resolve("work/test-data");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(resolve(root, "persistence-")),
    path = resolve(directory, "test.sqlite");
  let db = openDatabase(path);
  try {
    createRideService(db).seed();
    const before = db.prepare("SELECT COUNT(*) AS n FROM rides").get().n;
    db.close();
    db = openDatabase(path);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM rides").get().n, before);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get().n,
      3,
    );
    assert.equal(createRideService(db).seed(), false);
  } finally {
    db.close();
    for (const suffix of ["", "-wal", "-shm"])
      rmSync(path + suffix, { force: true });
    rmdirSync(directory);
  }
});

test('recurring offers generate unique weekdays and do not resurrect cancelled occurrences', async t => {
  const f=await fixture(t),host=await f.login('Host'),rider=await f.login('Alex');
  const start=new Date(Date.now()+86400000),end=new Date(start.getTime()+14*86400000).toISOString().slice(0,10);
  const response=await f.call('/api/rides',{cookie:host.cookie,body:{...offer(),type:'carpool',capacity:4,recurring:{weekdays:[1,3,5],endDate:end}}});
  assert.equal(response.status,201);
  const initial=response.data.state.rides,template=response.data.state.schedules[0];
  assert.ok(initial.length>=5);assert.deepEqual(template.weekdays,[1,3,5]);
  assert.ok(initial.every(r=>[1,3,5].includes(new Date(r.departure).getUTCDay())));
  f.app.rides.generateScheduled();f.app.rides.generateScheduled();
  assert.equal((await f.call('/api/state',{cookie:host.cookie})).data.state.rides.length,initial.length);
  await f.call(`/api/rides/${initial[0].id}/cancel`,{cookie:host.cookie,body:{}});
  f.app.rides.generateScheduled();
  assert.equal((await f.call('/api/state',{cookie:host.cookie})).data.state.rides.find(r=>r.id===initial[0].id).status,'cancelled');
  await f.call(`/api/rides/${initial[1].id}/bookings`,{cookie:rider.cookie,body:{seats:1,idempotencyKey:randomUUID()}});
  assert.equal((await f.call(`/api/schedules/${template.id}/stop`,{cookie:rider.cookie,body:{}})).status,404);
  const stopped=await f.call(`/api/schedules/${template.id}/stop`,{cookie:host.cookie,body:{}});
  assert.equal(stopped.status,200);assert.equal(stopped.data.state.schedules[0].active,false);
  assert.ok(stopped.data.state.rides.every(r=>r.status==='cancelled'));
  assert.equal((await f.call('/api/state',{cookie:rider.cookie})).data.state.bookings[0].status,'cancelled');
  f.app.rides.generateScheduled();assert.equal(f.db.prepare("SELECT COUNT(*) n FROM rides WHERE status='open'").get().n,0);
});

test('recurring dates and empty selections are rejected', async t => {
  const f=await fixture(t),host=await f.login('Host');
  for(const recurring of [{weekdays:[],endDate:'2026-12-01'},{weekdays:[1],endDate:'2026-02-30'},{weekdays:[1],endDate:'2000-01-01'},{weekdays:[6],endDate:'2026-12-01'}]) {
    assert.equal((await f.call('/api/rides',{cookie:host.cookie,body:{...offer(),recurring}})).status,400);
  }
});

test('contacts are shared only for confirmed participants and disappear after cancellation',async t=>{
  const f=await fixture(t),host=await f.login('Host'),rider=await f.login('Alex'),outsider=await f.login('Blair');
  const ride=(await f.call('/api/rides',{cookie:host.cookie,body:offer()})).data;
  assert.equal((await f.call('/api/state',{cookie:rider.cookie})).data.state.rides[0].hostEmail,undefined);
  const booking=(await f.call(`/api/rides/${ride.id}/bookings`,{cookie:rider.cookie,body:{seats:1,idempotencyKey:randomUUID()}})).data;
  assert.equal(booking.state.rides[0].hostEmail,host.user.email);
  const hostView=(await f.call('/api/state',{cookie:host.cookie})).data.state;
  assert.equal(hostView.rides[0].passengers[0].email,rider.user.email);
  const outsiderView=(await f.call('/api/state',{cookie:outsider.cookie})).data.state;
  assert.equal(outsiderView.rides[0].hostEmail,undefined);assert.equal(outsiderView.rides[0].passengers,undefined);
  await f.call(`/api/bookings/${booking.id}/cancel`,{cookie:rider.cookie,body:{}});
  assert.equal((await f.call('/api/state',{cookie:rider.cookie})).data.state.rides[0].hostEmail,undefined);
});

test('reports require valid text; only administrators can resolve reports and suspend users',async t=>{
  const f=await fixture(t),host=await f.login('Host'),rider=await f.login('Alex'),admin=await f.login('Admin');
  f.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.user.id);
  const ride=(await f.call('/api/rides',{cookie:host.cookie,body:offer()})).data;
  assert.equal((await f.call('/api/admin',{cookie:rider.cookie})).status,403);
  assert.equal((await f.call(`/api/rides/${ride.id}/report`,{cookie:rider.cookie,body:{reason:'bad'}})).status,400);
  assert.equal((await f.call(`/api/rides/${ride.id}/report`,{cookie:rider.cookie,body:{reason:'The meeting point needs clarification.'}})).status,201);
  assert.equal((await f.call(`/api/rides/${ride.id}/report`,{cookie:rider.cookie,body:{reason:'Another report for the same ride.'}})).status,409);
  const overview=(await f.call('/api/admin',{cookie:admin.cookie})).data;
  assert.equal(overview.counts.reports,1);const reportId=overview.reports[0].id;
  assert.equal((await f.call(`/api/admin/reports/${reportId}/resolve`,{cookie:rider.cookie,body:{}})).status,403);
  assert.equal((await f.call(`/api/admin/reports/${reportId}/resolve`,{cookie:admin.cookie,body:{}})).status,200);
  await f.call(`/api/rides/${ride.id}/bookings`,{cookie:rider.cookie,body:{seats:1,idempotencyKey:randomUUID()}});
  assert.equal((await f.call(`/api/admin/users/${host.user.id}/suspend`,{cookie:rider.cookie,body:{suspended:true}})).status,403);
  assert.equal((await f.call(`/api/admin/users/${admin.user.id}/suspend`,{cookie:admin.cookie,body:{suspended:true}})).status,400);
  assert.equal((await f.call(`/api/admin/users/${host.user.id}/suspend`,{cookie:admin.cookie,body:{suspended:true}})).status,200);
  assert.equal((await f.call('/api/state',{cookie:host.cookie})).status,401);
  assert.equal((await f.call('/api/state',{cookie:rider.cookie})).data.state.bookings[0].status,'cancelled');
  assert.equal((await f.call('/api/auth/request-code',{body:profile('Host')})).status,403);
  assert.equal((await f.call(`/api/admin/users/${host.user.id}/suspend`,{cookie:admin.cookie,body:{suspended:false}})).status,200);
  assert.equal((await f.call('/api/state',{cookie:host.cookie})).status,401);
  assert.equal((await f.call('/api/admin',{cookie:admin.cookie})).data.counts.reports,0);
});

test('real email verification invalidates earlier development sessions and codes',async t=>{
  const db=openDatabase(':memory:');t.after(()=>db.close());
  const opts={secret:'test',domains:['mitwpu.edu.in'],cooldownMs:0};
  const dev=createAuth(db,{...opts,mailer:developmentMailer});
  const first=await dev.requestCode(profile('Alex'),'local');const oldSession=dev.verify({challengeId:first.challengeId,code:first.developmentCode});
  let actualCode;
  const real=createAuth(db,{...opts,mailer:{mode:'resend',async sendCode(_email,code){actualCode=code;}}});
  assert.equal(real.session(oldSession.token),null);
  const second=await real.requestCode(profile('Alex'),'local');const realSession=real.verify({challengeId:second.challengeId,code:actualCode});
  assert.equal(realSession.user.verification,'email');assert.equal(dev.session(oldSession.token),null);
  assert.equal(real.session(realSession.token).verification,'email');
  await assert.rejects(dev.requestCode(profile('Alex'),'local'),/Resend mode/);
});
