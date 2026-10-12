import { Request, Response, NextFunction } from "express";
import {
  errorHandler,
  notFoundHandler,
  CustomError,
  AppError,
} from "../src/middleware/errorHandler";

describe("Error Handlers Unit Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      log: {
        error: jest.fn(),
      },
    } as unknown as Request;
    mockRes = {
      headersSent: false,
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;
    mockNext = jest.fn();

  });

  describe("notFoundHandler", () => {
    it("should return 404 status and { error: 'Route not found' }", () => {
      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Route not found" });
    });
  });

  describe("errorHandler", () => {
    it("should return 400 for JSON SyntaxError with body", () => {
      const err = new SyntaxError("Unexpected token in JSON");
      (err as any).body = "{ malformed";

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid JSON format" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return operational error status and message for 4xx errors", () => {
      const customErr: CustomError = new Error("Invalid request data");
      customErr.status = 422;

      errorHandler(customErr, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid request data" });
    });

    it("should return operational status and message when using AppError", () => {
      const appErr = new AppError("Resource conflict", 409);

      errorHandler(appErr, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Resource conflict" });
    });

    it("should return 500 with 'Internal Server Error' and conceal internal details/stack", () => {
      const serverErr = new Error("Database connection secret credentials leaked in error");

      errorHandler(serverErr, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Internal Server Error" });
      expect(jsonMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("secret credentials"),
        })
      );
    });

    it("should delegate to next(err) if response headers were already sent", () => {
      mockRes.headersSent = true;
      const err = new Error("Error after headers sent");

      errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(err);
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });
});
