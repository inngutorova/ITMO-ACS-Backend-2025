import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../src/data-source";
import User from "../src/entities/User";
import { authenticate } from "../src/middleware/auth";
import { authorizeAdmin } from "../src/middleware/authAdm";

jest.mock("jsonwebtoken");
jest.mock("../src/data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe("Middleware: authenticate", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("should return 401 if no token", () => {
    authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No token provided" });
  });

  test("should return 401 if tolen invalid", () => {
    req.headers = { authorization: "Bearer invalidtoken" };

    (jwt.verify as jest.Mock).mockImplementation((_token, _secret, cb) => {
      cb(new Error("Invalid token"), null);
    });

    authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
  });

  test("should add userId and call next id token is valid", () => {
    req.headers = { authorization: "Bearer validtoken" };

    (jwt.verify as jest.Mock).mockImplementation((_token, _secret, cb) => {
      cb(null, { id: 5 });
    });

    authenticate(req as Request, res as Response, next);

    expect((req as any).userId).toBe(5);
    expect(next).toHaveBeenCalled();
  });
});