import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import request from "supertest";
import { setupStrapi, stopStrapi, sleep } from "../helpers/strapi";
import { createUser, defaultData, mockUserData } from "./factory";

/** this code is called once before any test is called */
beforeAll(async () => {
  await setupStrapi(); // singleton so it can be called many times
}, 1000000);

/** this code is called once before all the tested are finished */
afterAll(async () => {
  await stopStrapi();
});

describe("Default User methods", () => {
  let user;

  beforeAll(async () => {
    user = await createUser({});
  });

  it("should login user and return jwt token", async () => {
    const jwt = strapi.plugins["users-permissions"].services.jwt.issue({
      id: user.id,
    });

    await request(strapi.server.httpServer) // app server is and instance of Class: http.Server
      .post("/api/auth/local")
      .set("accept", "application/json")
      .set("Content-Type", "application/json")
      .send({
        identifier: user.email,
        password: defaultData.password,
      })
      .expect("Content-Type", /json/)
      .expect(200)
      .then(async (data) => {
        expect(data.body.jwt).toBeDefined();
        const verified = await strapi.plugins[
          "users-permissions"
        ].services.jwt.verify(data.body.jwt);

        expect(data.body.jwt === jwt || !!verified).toBe(true); // jwt does have a random seed, each issue can be different
      });
  });
});

describe("Successful Authentication", () => {
  let testUser: { email: string; id: number; username: string };
  let testPassword: string;

  beforeAll(async () => {
    testPassword = "User1234"; // Example password
    testUser = await createUser({
      email: "testuser@example.com",
      password: testPassword,
    });
  });

  it("should return valid JWT token", async () => {
    const response = await request(strapi.server.httpServer)
      .post("/api/auth/local")
      .set("accept", "application/json")
      .set("Content-Type", "application/json")
      .send({
        identifier: testUser.email,
        password: testPassword,
      })
      .expect("Content-Type", /json/)
      .expect(200);

    // Verificar estructura de respuesta
    expect(response.body).toEqual({
      jwt: expect.any(String),
      user: {
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        provider: "local",
        confirmed: expect.any(Boolean),
        blocked: expect.any(Boolean),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });

    // Verificar JWT
    const verified = await strapi.plugins[
      "users-permissions"
    ].services.jwt.verify(response.body.jwt);
    expect(verified.id).toBe(testUser.id);
  });
});

describe("Failed Authentication", () => {
  let testUser: { email: string; id: number; username: string };
  let testPassword: string;

  beforeAll(async () => {
    testPassword = "User1234"; // Example password
    testUser = await createUser({
      email: "testuser@example.com",
      password: testPassword,
    });
  });

  it("should reject invalid password", async () => {
    await request(strapi.server.httpServer)
      .post("/api/auth/local")
      .send({
        identifier: testUser.email,
        password: "wrongpassword",
      })
      .expect(400)
      .then((response) => {
        expect(response.body.error.message).toBe(
          "Invalid identifier or password"
        );
      });
  });

  it("should reject invalid email", async () => {
    await request(strapi.server.httpServer)
      .post("/api/auth/local")
      .send({
        identifier: "nonexistent@example.com",
        password: testPassword,
      })
      .expect(400)
      .then((response) => {
        expect(response.body.error.message).toBe(
          "Invalid identifier or password"
        );
      });
  });

  it("should require both identifier and password", async () => {
    await request(strapi.server.httpServer)
      .post("/api/auth/local")
      .send({ identifier: testUser.email })
      .expect(400);

    await request(strapi.server.httpServer)
      .post("/api/auth/local")
      .send({ password: testPassword })
      .expect(400);
  });
});
