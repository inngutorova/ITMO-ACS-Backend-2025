import { Request, Response } from "express";
import { UserController } from "../src/controllers/userController";
import { AppDataSource } from "../src/data-source";
import User from "../src/entities/User";

jest.mock("../src/data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe("UserController", () => {
  let mockFind: jest.Mock;
  let mockFindOneBy: jest.Mock;
  let mockSave: jest.Mock;
  let mockDelete: jest.Mock;
  let mockMerge: jest.Mock;
  let res: Partial<Response>;

  beforeEach(() => {
    mockFind = jest.fn();
    mockFindOneBy = jest.fn();
    mockSave = jest.fn();
    mockDelete = jest.fn();
    mockMerge = jest.fn();

    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      find: mockFind,
      findOneBy: mockFindOneBy,
      save: mockSave,
      delete: mockDelete,
      merge: mockMerge,
    });

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getProfile: should return user profile", async () => {
    const req = { userId: 1 } as unknown as Request;

    const mockUser = {
      id: 1,
      username: "testuser",
      email: "test@mail.com",
      first_name: "Test",
      last_name: "User",
      isAdmin: false,
    };

    mockFindOneBy.mockResolvedValue(mockUser);

    await UserController.getProfile(req, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      username: "testuser",
      email: "test@mail.com",
      first_name: "Test",
      last_name: "User",
      isAdmin: false,
    });
  });

  test("getProfile: should return 404 if user not found", async () => {
    const req = { userId: 99 } as unknown as Request;

    mockFindOneBy.mockResolvedValue(null);

    await UserController.getProfile(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  test("getAllUsers: should return list of users", async () => {
    const fakeUsers = [
      { id: 1, username: "Inna", email: "inna@mail.com" },
      { id: 2, username: "Alex", email: "alex@mail.com" },
    ];
    mockFind.mockResolvedValue(fakeUsers);

    await UserController.getAllUsers({} as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ username: "Inna" }),
      expect.objectContaining({ username: "Alex" }),
    ]);
  });

  test("getAllUsers: should return empty list if no users", async () => {
    mockFind.mockResolvedValue([]);

    await UserController.getAllUsers({} as Request, res as Response);

    expect(mockFind).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([]);
  });


  test("getUserById: should return 404 if user doesnt exist", async () => {
    mockFindOneBy.mockResolvedValue(null);

    const req = { params: { id: "999" } } as unknown as Request;
    await UserController.getUserById(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  test("getUserById: should return user info by id", async () => {
    const fakeUser = { id: 1, username: "Inna" };
    mockFindOneBy.mockResolvedValue(fakeUser);

    const req = { params: { id: "1" } } as unknown as Request;
    await UserController.getUserById(req, res as Response);

    expect(res.json).toHaveBeenCalledWith(fakeUser);
  });


  test("updateUser: should change username", async () => {
    const fakeUser = { id: 1, username: "Old" };
    const updated = { id: 1, username: "New" };

    mockFindOneBy.mockResolvedValue(fakeUser);
    mockMerge.mockReturnValue(updated);
    mockSave.mockResolvedValue(updated);

    const req = {
      params: { id: "1" },
      body: { username: "New" },
    } as unknown as Request;

    await (UserController.updateUser[1] as any)(req, res);

    expect(mockMerge).toHaveBeenCalledWith(fakeUser, { username: "New" });
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  test("updateUser: should return 404 if user doesnt exist", async () => {
    mockFindOneBy.mockResolvedValue(null);

    const req = {
      params: { id: "99" },
      body: { username: "new" },
    } as unknown as Request;

    await (UserController.updateUser[1] as any)(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  test("deleteUser: should return 404 if user doesnt exist", async () => {
    mockDelete.mockResolvedValue({ affected: 0 });
    const req = { params: { id: "2" } } as unknown as Request;

    await (UserController.deleteUser[1] as any)(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  test("deleteUser: should return message if deleted", async () => {
    mockDelete.mockResolvedValue({ affected: 1 });
    const req = { params: { id: "2" } } as unknown as Request;

    await (UserController.deleteUser[1] as any)(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: "User deleted" });
  });
});
