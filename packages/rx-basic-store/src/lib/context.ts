import { BehaviorSubject } from 'rxjs';
import { DataApi } from './data-api';
import { ActionType, StateContextType } from './types';

export class StateContext<T> implements StateContextType<T> {
  constructor(
    private subject: BehaviorSubject<T>,
    private storeContext: Map<string, unknown>,
    public initialState: T,
    public dataApi?: DataApi<T>,
  ) {}

  restoreState = async () => {
    if (this.dataApi) {
      const restoredState = await this.dataApi.getState();
      if (restoredState) {
        return this.setState(restoredState);
      }
    }
    return this.getState();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch<P>(action: ActionType<T, P>) {
    return action.execute(this as any) as Promise<T>; // trick compiler here
  }

  getContext<T2>(name: string) {
    return this.storeContext.get(name) as T2;
  }
  setStoreContext = (context: { name: string; dependency: unknown }[]) => {
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
