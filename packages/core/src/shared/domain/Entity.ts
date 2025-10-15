import { UniqueEntityID } from './UniqueEntityID';

export abstract class Entity<TProps> {
  protected readonly props: TProps;
  private readonly _id: UniqueEntityID;

  protected constructor(props: TProps, id?: UniqueEntityID) {
    this.props = props;
    this._id = id ?? new UniqueEntityID();
  }

  get id(): UniqueEntityID {
    return this._id;
  }

  equals(object?: Entity<TProps>): boolean {
    if (!object) {
      return false;
    }

    if (object === this) {
      return true;
    }

    return this._id.equals(object._id);
  }
}
