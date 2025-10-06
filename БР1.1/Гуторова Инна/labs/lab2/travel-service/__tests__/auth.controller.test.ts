import { Request, Response } from "express";
import { AppDataSource } from "../src/data-source";
import * as AuthController from "../src/controllers/authController";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

jest.mock("../src/data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

describe("Auth Controller", () => {
  let mockFindOneBy: jest.Mock;
  let mockCreate: jest.Mock;
  let mockSave: jest.Mock;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFindOneBy = jest.fn();
    mockCreate = jest.fn();
    mockSave = jest.fn();

    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOneBy: mockFindOneBy,
      create: mockCreate,
      save: mockSave,
    });

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("register: should create user and return 201", async () => {
    mockFindOneBy.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed123");
    mockCreate.mockReturnValue({ id: 1, email: "test@mail.com" });
    mockSave.mockResolvedValue({});

    const req = {
      body: {
        email: "test@mail.com",
        password: "123",
        username: "inna",
      },
    } as unknown as Request;

    await AuthController.register(req, res as Response);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@mail.com",
        hashed_password: "hashed123",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "User registered successfully" });
  });

  test("register: should return 400 if user with this email exiists", async () => {
    mockFindOneBy.mockResolvedValue({ id: 1 });

    const req = {
      body: { email: "exists@mail.com" },
    } as unknown as Request;

    await AuthController.register(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
  });

  test("register: should return 400 if there isnt email", async () => {
    const req = {
      body: { password: "123", username: "inna" },
    } as unknown as Request;

    await AuthController.register(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("login: should return token", async () => {
    mockFindOneBy.mockResolvedValue({ id: 1, email: "test@mail.com", hashed_password: "hashed" });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue("token123");

    const req = {
      body: { email: "test@mail.com", password: "123" },
    } as unknown as Request;

    await AuthController.login(req, res as Response);

    expect(res.json).toHaveBeenCalledWith({ token: "token123" });
  });

  test("login: should return 400 if user doesnt exist", async () => {
    mockFindOneBy.mockResolvedValue(null);

    const req = {
      body: { email: "unknown@mail.com", password: "123" },
    } as unknown as Request;

    await AuthController.login(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password" });
  });

  test("login: should return 400 if password is incorrect", async () => {
    mockFindOneBy.mockResolvedValue({ email: "test@mail.com", hashed_password: "hash" });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const req = {
      body: { email: "test@mail.com", password: "wrong" },
    } as unknown as Request;

    await AuthController.login(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password" });
  });

  test("updatePassword: should update password successfully", async () => {
    const user = { id: 1, hashed_password: "oldhash" };

    mockFindOneBy.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue("newhash");
    mockSave.mockResolvedValue({});

    const req = {
      body: { oldPassword: "old", newPassword: "new" },
      userId: 1,
    } as unknown as Request;

    await AuthController.updatePassword(req, res as Response);

    expect(bcrypt.compare).toHaveBeenCalledWith("old", "oldhash");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Password updated successfully" });
  });

  test("updatePassword: should return 404 if user not found", async () => {
    mockFindOneBy.mockResolvedValue(null);

    const req = {
      body: { oldPassword: "123", newPassword: "456" },
      userId: 1,
    } as unknown as Request;

    await AuthController.updatePassword(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  test("updatePassword: should return 400 if old password is incorrect", async () => {
    mockFindOneBy.mockResolvedValue({ id: 1, hashed_password: "hash" });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const req = {
      body: { oldPassword: "wrong", newPassword: "new" },
      userId: 1,
    } as unknown as Request;

    await AuthController.updatePassword(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Incorrect old password" });
  });

  test("updatePassword: should return 400 if no userId", async () => {
    const req = {
      body: { oldPassword: "123", newPassword: "456" },
    } as unknown as Request;

    await AuthController.updatePassword(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "User not authenticated" });
  });
});
