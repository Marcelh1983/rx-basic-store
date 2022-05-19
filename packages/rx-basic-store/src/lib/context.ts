import { BehaviorSubject } from 'rxjs';
import { StateContextType, ActionTypePartial } from './types';

export class StateContext<T> implements StateContextType<T> {

  constructor(
    protected ctx: BehaviorSubject<T>,
    protected storeContext: Map<string, unknown>
  ) {

  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch = (action: ActionTypePartial<T>) =>
    action.execute(this as any) as Promise<T>; // trick compiler here

  getContext<T2>(name: string) {
    return this.storeContext.get(name) as T2;
  }
  getState = () => this.ctx.getValue();

  setState = (state: T) => {
    const updatedState = { ...state };
    this.ctx.next(updatedState);
    return Promise.resolve(updatedState);
  };
  patchState = (state: Partial<T>) => {
    const current = this.ctx.getValue();
    const merged = { ...current, ...state } as T;
    this.ctx.next(merged);
    return Promise.resolve(merged);
  };
}