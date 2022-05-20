import { BehaviorSubject } from 'rxjs';
import { StateContextType, ActionTypePartial } from './types';

export class StateContext<T> implements StateContextType<T> {

  constructor(
    protected subject: BehaviorSubject<T>,
    protected storeContext: Map<string, unknown>
  ) {

  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch = (action: ActionTypePartial<T>) =>
    action.execute(this as any) as Promise<T>; // trick compiler here

  getContext<T2>(name: string) {
    return this.storeContext.get(name) as T2;
  }
  setStoreContext = (
    context: { name: string; dependency: unknown }[]
  ) => {
    context.forEach((c) => {
      if (this.storeContext.get(c.name)) {
        console.warn(
          `${c.name} is already added in the store context. Overriding current value`
        );
      }
      this.storeContext.set(c.name, c.dependency);
    });
  };
  getState = () => this.subject.getValue();

  setState = (state: T) => {
    const updatedState = { ...state };
    this.subject.next(updatedState);
    return Promise.resolve(updatedState);
  };
  patchState = (state: Partial<T>) => {
    const current = this.subject.getValue();
    const merged = { ...current, ...state } as T;
    this.subject.next(merged);
    return Promise.resolve(merged);
  };
}