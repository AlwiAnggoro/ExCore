export interface GuardResult {
  succeeded: boolean;
  message?: string;
}

interface GuardArgument<T> {
  argument: T;
  argumentName: string;
}

export class Guard {
  static againstNullOrUndefined<T>(value: T, argumentName: string): GuardResult {
    if (value === null || value === undefined) {
      return {
        succeeded: false,
        message: `${argumentName} is required`,
      };
    }

    return { succeeded: true };
  }

  static againstEmpty(value: string, argumentName: string): GuardResult {
    if (value.trim().length === 0) {
      return {
        succeeded: false,
        message: `${argumentName} must not be empty`,
      };
    }

    return { succeeded: true };
  }

  static againstNullOrUndefinedBulk(args: Array<GuardArgument<unknown>>): GuardResult {
    for (const arg of args) {
      const result = Guard.againstNullOrUndefined(arg.argument, arg.argumentName);
      if (!result.succeeded) {
        return result;
      }
    }

    return { succeeded: true };
  }

  static isOneOf<T>(value: T, validValues: readonly T[], argumentName: string): GuardResult {
    if (!validValues.includes(value)) {
      return {
        succeeded: false,
        message: `${argumentName} must be one of [${validValues.join(', ')}]`,
      };
    }

    return { succeeded: true };
  }

  static inRange(value: number, min: number, max: number, argumentName: string): GuardResult {
    if (value < min || value > max) {
      return {
        succeeded: false,
        message: `${argumentName} must be between ${min} and ${max}`,
      };
    }

    return { succeeded: true };
  }

  static combine(results: GuardResult[]): GuardResult {
    for (const result of results) {
      if (!result.succeeded) {
        return result;
      }
    }

    return { succeeded: true };
  }
}
