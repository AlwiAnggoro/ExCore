export abstract class ValueObject<TProps extends Record<string, unknown>> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  equals(vo?: ValueObject<TProps>): boolean {
    if (!vo) {
      return false;
    }

    if (vo === this) {
      return true;
    }

    return ValueObject.shallowEqual(this.props, vo.props);
  }

  private static shallowEqual(
    left: Record<string, unknown>,
    right: Record<string, unknown>,
  ): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every((key) => Object.is(left[key], right[key]));
  }
}
