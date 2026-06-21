import { describe, expect, test, jest } from "@jest/globals";
import { ok, fail } from "../src/utils/apiResponse.js";
import { Response } from "express";

describe("ApiResponse Utility", () => {
  const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res) as any;
    res.json = jest.fn().mockReturnValue(res) as any;
    return res;
  };

  test("ok() should send success response with 200 by default", () => {
    const res = mockResponse();
    const data = { id: 1, name: "Test" };
    
    ok(res, data);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data
    });
  });

  test("ok() should send success response with custom status code", () => {
    const res = mockResponse();
    const data = { message: "Created" };
    
    ok(res, data, 201);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("fail() should send error response with 400 by default", () => {
    const res = mockResponse();
    
    fail(res, "INVALID_INPUT", "Missing required fields");

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Missing required fields",
        statusCode: 400
      }
    });
  });

  test("fail() should send error response with custom status code", () => {
    const res = mockResponse();
    
    fail(res, "NOT_FOUND", "User not found", 404);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "User not found",
        statusCode: 404
      }
    });
  });
});
