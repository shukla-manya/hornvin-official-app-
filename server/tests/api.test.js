const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { buildApp } = require("../app");
const { connectDB } = require("../config/db");
const User = require("../models/User");

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
