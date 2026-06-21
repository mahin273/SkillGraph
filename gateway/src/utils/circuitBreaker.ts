type RequestFunction<T> = () => Promise<T>;

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN"
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private nextAttemptTime: number = 0;

  constructor(
    private serviceName: string,
    private failureThreshold: number = 3,
    private resetTimeoutMs: number = 10000
  ) {}

  public async execute<T>(fn: RequestFunction<T>, fallback: T): Promise<T> {
    this.updateState();

    if (this.state === CircuitState.OPEN) {
      console.warn(`[CircuitBreaker] Service "${this.serviceName}" circuit is OPEN. Returning fallback.`);
      return fallback;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure(error);
      return fallback;
    }
  }

  private updateState(): void {
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttemptTime) {
      this.state = CircuitState.HALF_OPEN;
      console.log(`[CircuitBreaker] Service "${this.serviceName}" state transitioned to HALF-OPEN.`);
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(error: any): void {
    this.failureCount++;
    console.error(`[CircuitBreaker] Service "${this.serviceName}" failed (${this.failureCount}/${this.failureThreshold} errors):`, error?.message || error);
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
      console.error(`[CircuitBreaker] Service "${this.serviceName}" state transitioned to OPEN. Blocked for ${this.resetTimeoutMs}ms.`);
    }
  }
}