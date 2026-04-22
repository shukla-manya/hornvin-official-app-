const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { buildApp } = require("../app");
const { connectDB } = require("../config/db");
const User = require("../models/User");
const { signToken } = require("../utils/token");

let app;
let mongoServer;

function uniquePhone(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  // MongoDB does not allow spaces in database names; this is the "b2b users" app database.
  process.env.MONGODB_URI = mongoServer.getUri("b2b_users");
  app = buildApp();
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe("API integration", () => {
  it("GET /health and /api/health return success", async () => {
    const r1 = await request(app).get("/health").expect(200);
    expect(r1.body.success).toBe(true);
    expect(r1.body.data.service).toBe("garage-b2b-backend");
    const r2 = await request(app).get("/api/health").expect(200);
    expect(r2.body.success).toBe(true);
  });

  it("garage register is pending with no token; login blocked until approved", async () => {
    const phone = uniquePhone("9");
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Garage", phone, password: "secret12", role: "garage" })
      .expect(201);
    expect(reg.body.data.user.status).toBe("pending");
    expect(reg.body.data.token).toBeNull();

    const login = await request(app)
      .post("/api/auth/login")
      .send({ phone, password: "secret12" })
      .expect(403);
    expect(login.body.code).toBe("ACCOUNT_PENDING");
  });

  it("admin approves garage then garage can login and call /me; no token returns 401", async () => {
    const adminPhone = uniquePhone("1");
    const garagePhone = uniquePhone("2");
    await User.create({
      name: "Admin",
      phone: adminPhone,
      password: "adminpass1",
      role: "admin",
      status: "approved",
      createdBy: null,
    });

    await request(app)
      .post("/api/auth/register")
      .send({ name: "G", phone: garagePhone, password: "garagepass1", role: "garage" })
      .expect(201);

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ phone: adminPhone, password: "adminpass1" })
      .expect(200);
    const adminToken = adminLogin.body.data.token;

    const list = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const garageUser = list.body.data.users.find((u) => u.phone === garagePhone);
    expect(garageUser).toBeDefined();

    await request(app)
      .patch(`/api/admin/users/${garageUser.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const garageLogin = await request(app)
      .post("/api/auth/login")
      .send({ phone: garagePhone, password: "garagepass1" })
      .expect(200);
    const garageToken = garageLogin.body.data.token;
    expect(garageToken).toBeTruthy();

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${garageToken}`).expect(200);
    expect(me.body.data.user.phone).toBe(garagePhone);

    const noAuth = await request(app).get("/api/auth/me").expect(401);
    expect(noAuth.body.code).toBe("UNAUTHORIZED");
  });

  it("user self-register is approved and receives token", async () => {
    const phone = uniquePhone("3");
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: "End User", phone, password: "userpass12", role: "user" })
      .expect(201);
    expect(reg.body.data.user.status).toBe("approved");
    expect(reg.body.data.token).toBeTruthy();
  });

  it("garage cannot access admin routes", async () => {
    const adminPhone = uniquePhone("4");
    const garagePhone = uniquePhone("5");
    await User.create({
      name: "Admin",
      phone: adminPhone,
      password: "adminpass1",
      role: "admin",
      status: "approved",
      createdBy: null,
    });
    await request(app)
      .post("/api/auth/register")
      .send({ name: "G", phone: garagePhone, password: "garagepass1", role: "garage" })
      .expect(201);
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ phone: adminPhone, password: "adminpass1" })
      .expect(200);
    const adminToken = adminLogin.body.data.token;
    const list = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const garageUser = list.body.data.users.find((u) => u.phone === garagePhone);
    await request(app)
      .patch(`/api/admin/users/${garageUser.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const garageLogin = await request(app)
      .post("/api/auth/login")
      .send({ phone: garagePhone, password: "garagepass1" })
      .expect(200);
    const garageToken = garageLogin.body.data.token;

    const forbidden = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${garageToken}`)
      .expect(403);
    expect(forbidden.body.code).toBe("FORBIDDEN");
  });

  it("admin creates distributor; distributor can hit /ping", async () => {
    const adminPhone = uniquePhone("6");
    const distPhone = uniquePhone("7");
    await User.create({
      name: "Admin",
      phone: adminPhone,
      password: "adminpass1",
      role: "admin",
      status: "approved",
      createdBy: null,
    });
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ phone: adminPhone, password: "adminpass1" })
      .expect(200);
    const adminToken = adminLogin.body.data.token;

    const created = await request(app)
      .post("/api/admin/distributors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Dist Co", phone: distPhone, password: "distpass12" })
      .expect(201);
    expect(created.body.data.user.role).toBe("distributor");

    const distLogin = await request(app)
      .post("/api/auth/login")
      .send({ phone: distPhone, password: "distpass12" })
      .expect(200);
    const distToken = distLogin.body.data.token;

    const ping = await request(app)
      .get("/api/distributor/ping")
      .set("Authorization", `Bearer ${distToken}`)
      .expect(200);
    expect(ping.body.data.message).toBe("Distributor area OK");
  });

  it("register rejects non-public roles", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Bad",
        phone: uniquePhone("8"),
        password: "secret12",
        role: "admin",
      })
      .expect(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("OpenAPI and docs", () => {
  it("GET / returns landing page with credit and API doc links", async () => {
    const res = await request(app).get("/").expect(200);
    expect(res.text).toMatch(/Made with love by Manya Shukla/i);
    expect(res.text).toMatch(/api-docs/);
    expect(res.text).toMatch(/Swagger UI/i);
  });

  it("GET /api-docs.json returns parsed OpenAPI with paths", async () => {
    const res = await request(app).get("/api-docs.json").expect(200);
    expect(res.body.paths).toBeDefined();
    expect(res.body.openapi || res.body.swagger).toBeDefined();
  });

  it("GET /api-docs serves Swagger UI (HTML)", async () => {
    const res = await request(app).get("/api-docs").redirects(2).expect(200);
    expect(res.text).toMatch(/html/i);
  });
});

describe("Auth validation and errors", () => {
  it("POST /api/auth/register returns 400 when fields missing", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "A" }).expect(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/register defaults role to garage when omitted", async () => {
    const phone = uniquePhone("d");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "No Role", phone, password: "secret12" })
      .expect(201);
    expect(res.body.data.user.role).toBe("garage");
    expect(res.body.data.user.status).toBe("pending");
    expect(res.body.data.token).toBeNull();
  });

  it("POST /api/auth/register returns 409 when phone already exists", async () => {
    const phone = uniquePhone("c");
    await request(app)
      .post("/api/auth/register")
      .send({ name: "First", phone, password: "secret12", role: "user" })
      .expect(201);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Second", phone, password: "otherpass1", role: "user" })
      .expect(409);
    expect(res.body.code).toBe("CONFLICT");
  });

  it("POST /api/auth/register rejects distributor self-signup", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "D", phone: uniquePhone("b"), password: "secret12", role: "distributor" })
      .expect(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/login returns 400 when fields missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ phone: "1" }).expect(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/login returns 401 for unknown phone", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ phone: uniquePhone("x"), password: "secret12" })
      .expect(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("POST /api/auth/login returns 401 for wrong password", async () => {
    const phone = uniquePhone("y");
    await User.create({
      name: "U",
      phone,
      password: "correctpass1",
      role: "user",
      status: "approved",
      createdBy: null,
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ phone, password: "wrongpassword" })
      .expect(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("GET /api/auth/me returns 401 for invalid Bearer token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.valid.jwt")
      .expect(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/auth/me returns 403 ACCOUNT_PENDING for approved JWT but pending user", async () => {
    const user = await User.create({
      name: "Pending",
      phone: uniquePhone("p"),
      password: "secret12",
      role: "garage",
      status: "pending",
      createdBy: null,
    });
    const token = signToken({ userId: user._id.toString(), role: "garage" });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(403);
    expect(res.body.code).toBe("ACCOUNT_PENDING");
  });
});

describe("Admin routes — errors", () => {
  async function adminToken() {
    const phone = uniquePhone("adm");
    await User.create({
      name: "Admin",
      phone,
      password: "adminpass1",
      role: "admin",
      status: "approved",
      createdBy: null,
    });
    const login = await request(app).post("/api/auth/login").send({ phone, password: "adminpass1" }).expect(200);
    return login.body.data.token;
  }

  it("PATCH /api/admin/users/:id/approve returns 404 for unknown id", async () => {
    const token = await adminToken();
    const res = await request(app)
      .patch("/api/admin/users/507f1f77bcf86cd799439011/approve")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });

  it("PATCH /api/admin/users/:id/approve returns 400 when user is not a garage", async () => {
    const token = await adminToken();
    const endUser = await User.create({
      name: "End",
      phone: uniquePhone("eu"),
      password: "secret12",
      role: "user",
      status: "approved",
      createdBy: null,
    });
    const res = await request(app)
      .patch(`/api/admin/users/${endUser._id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/admin/distributors returns 400 when fields missing", async () => {
    const token = await adminToken();
    const res = await request(app)
      .post("/api/admin/distributors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Only" })
      .expect(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/admin/distributors returns 409 when phone already registered", async () => {
    const token = await adminToken();
    const phone = uniquePhone("dist");
    await request(app)
      .post("/api/admin/distributors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "D1", phone, password: "distpass12" })
      .expect(201);
    const res = await request(app)
      .post("/api/admin/distributors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "D2", phone, password: "otherdist1" })
      .expect(409);
    expect(res.body.code).toBe("CONFLICT");
  });

  it("GET /api/admin/users returns 401 without token", async () => {
    const res = await request(app).get("/api/admin/users").expect(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });
});

describe("Distributor routes — access", () => {
  it("GET /api/distributor/ping returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/distributor/ping").expect(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/distributor/ping returns 403 for non-distributor role", async () => {
    const phone = uniquePhone("g");
    await User.create({
      name: "Garage",
      phone,
      password: "garagepass1",
      role: "garage",
      status: "approved",
      createdBy: null,
    });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ phone, password: "garagepass1" })
      .expect(200);
    const res = await request(app)
      .get("/api/distributor/ping")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .expect(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });
});

describe("Unknown routes", () => {
  it("returns 404 for undefined API path", async () => {
    const res = await request(app).get("/api/does-not-exist").expect(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
