import { BehaviorSubject } from 'rxjs';
import { StateContext } from './context';
import {
  ActionType,
  ActionTypePartial,
  StoreType
} from './types';

export class Store<T> implements StoreType<T> {
  private subject!: BehaviorSubject<T>;
  private ctx!: StateContext<T>;
  private devToolsDispacher: any = null;
  private storeContext = new Map<string, unknown>();
  private callbacks: ((
    action: ActionType<T, unknown>,
    oldState: T,
    newState: T,
    context: Map<string, unknown>
  ) => void)[] = [];

  constructor(
    initialState: T,
    private devTools = false
  ) {
    this.subject = new BehaviorSubject<T>(initialState);
    this.ctx = new StateContext(
      this.subject,
      this.storeContext
    );
  }

  public subscribe = (setState: (state: T) => void) =>
    this.subject.subscribe(setState);

  public asObservable = () => this.subject.asObservable();

  public dispatch = async (action: ActionTypePartial<T>): Promise<T> => {
    const oldState = this.currentState();
    const newState: T = (await action.execute(this.ctx as any)) as any; // trick compiler here to be able to pass a partial of T
    if (this.devTools && this.devToolsDispacher) {
      this.devToolsDispacher(action, newState);
    }
    for (const callback of this.callbacks) {
      callback(
        JSON.parse(JSON.stringify(action)) as ActionType<T, unknown>,
        oldState,
        newState,
        this.storeContext
      );
    }
    return newState;
  };

  public currentState = () => this.ctx.getState();


  public addCallback(
    callback: (
      action: ActionType<T, unknown>,
      oldState: T,
      newState: T,
      context: Map<string, unknown>
    ) => void
  ) {
    this.callbacks.push(callback);
  }
}
