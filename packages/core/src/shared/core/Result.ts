export class Result<TValue, TError = string> {
  private constructor(
    private readonly success: boolean,
    private readonly _value?: TValue,
    private readonly _error?: TError,
  ) {
    if (success && _error !== undefined) {
      throw new Error('Invalid operation: successful result cannot contain an error.');
    }

    if (!success && _value !== undefined) {
      throw new Error('Invalid operation: failed result cannot contain a value.');
    }
  }

  static ok<TValue>(value: TValue): Result<TValue, never> {
    return new Result<TValue, never>(true, value, undefined);
  }

  static fail<TValue, TError>(error: TError): Result<TValue, TError> {
    return new Result<TValue, TError>(false, undefined, error);
  }

  static combine(results: Array<Result<unknown, unknown>>): Result<void, unknown> {
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail(result.error);
      }
    }

    return Result.ok<void>(undefined);
  }

  get isSuccess(): boolean {
    return this.success;
  }

  get isFailure(): boolean {
    return !this.success;
  }

  get value(): TValue {
    if (!this.success) {
      throw new Error('Cannot retrieve the value from a failed result.');
    }

    return this._value as TValue;
  }

  get error(): TError {
    if (this.success) {
      throw new Error('Cannot retrieve the error from a successful result.');
    }

    return this._error as TError;
  }
}
