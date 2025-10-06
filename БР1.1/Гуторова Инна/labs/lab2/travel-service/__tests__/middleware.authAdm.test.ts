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

describe("Middleware: authorizeAdmin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockFindOneBy: jest.Mock;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    mockFindOneBy = jest.fn();

    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOneBy: mockFindOneBy,
    });

    jest.clearAllMocks();
  });

  test("should return 401 if no userId", async () => {
    await authorizeAdmin(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  test("should return 403 if user doesnt exist", async () => {
    (req as any).userId = 1;
    mockFindOneBy.mockResolvedValue(null);

    await authorizeAdmin(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("should return 403 if user isnt admin", async () => {
    (req as any).userId = 1;
    mockFindOneBy.mockResolvedValue({ id: 1, isAdmin: false });

    await authorizeAdmin(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied: Admins only" });
  });

  test("should call next if user is admin", async () => {
    (req as any).userId = 1;
    mockFindOneBy.mockResolvedValue({ id: 1, isAdmin: true });

    await authorizeAdmin(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
