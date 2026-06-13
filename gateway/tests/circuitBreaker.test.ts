import { describe, expect, test, jest, beforeEach, afterEach } from "@jest/globals";
import { CircuitBreaker, CircuitState } from "../src/utils/circuitBreaker.js";

describe("CircuitBreaker Utility", () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  const serviceName = "TestService";
  const fallback = "fallback-value";

  test("should start in CLOSED state and execute function successfully", async () => {
    const cb = new CircuitBreaker(serviceName, 3, 1000);
    const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue("success-value");

    const result = await cb.execute(mockFn, fallback);

    expect(result).toBe("success-value");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("should return fallback when execution fails and eventually transition to OPEN", async () => {
    const threshold = 2;
    const cb = new CircuitBreaker(serviceName, threshold, 1000);
    const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error("Service fail"));

    // First failure
    const res1 = await cb.execute(mockFn, fallback);
    expect(res1).toBe(fallback);

    // Second failure - should trigger OPEN state
    const res2 = await cb.execute(mockFn, fallback);
    expect(res2).toBe(fallback);

    // Third call - should immediately return fallback without calling mockFn since circuit is OPEN
    const res3 = await cb.execute(mockFn, fallback);
    expect(res3).toBe(fallback);
    expect(mockFn).toHaveBeenCalledTimes(2); // Only called twice, third call was blocked
  });

  test("should transition to HALF-OPEN after reset timeout and CLOSED on success", async () => {
    const cb = new CircuitBreaker(serviceName, 1, 50); // small timeout
    const failFn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error("Fail"));

    // Trip the breaker
    await cb.execute(failFn, fallback);

    // Verify it is blocked
    await cb.execute(failFn, fallback);
    expect(failFn).toHaveBeenCalledTimes(1);

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Next execute should try again (HALF-OPEN)
    const successFn = jest.fn<() => Promise<string>>().mockResolvedValue("recovered");
    const result = await cb.execute(successFn, fallback);

    expect(result).toBe("recovered");
    expect(successFn).toHaveBeenCalledTimes(1);

    // Verify it is back to CLOSED state by trying failFn again
    const resultFail = await cb.execute(failFn, fallback);
    expect(resultFail).toBe(fallback);
    expect(failFn).toHaveBeenCalledTimes(2); // Called again because state was CLOSED
  });
});
