import { BehaviorSubject } from 'rxjs';
import { StateContext } from './context';
import { DataApi } from './data-api';
import { StoreType, ActionType } from './types';

export class Store<T> implements StoreType<T> {
  public ctx!: StateContext<T>;

  protected subject!: BehaviorSubject<T>;
  protected devToolsDispacher: any = null;
  protected storeContext = new Map<string, unknown>();
  protected callbacks: ((
    action: ActionType<T, unknown>,
    oldState: T,
    newState: T,
    context: Map<string, unknown>
  ) => void)[] = [];

  constructor(
    initialState: T,
    private devTools = false,
    private dataApi?: DataApi<T>
  ) {
    this.subject = new BehaviorSubject<T>(initialState);
    this.ctx = new StateContext<T>(this.subject, this.storeContext, dataApi);

    if (this.dataApi?.syncOptions) {
      if (this.dataApi.syncOptions.state?.sync) {
        // add callback to sync data to database
        this.addCallback((action, _, newState) => {
          if (action.neverStoreOrLog !== false) {
            this.storeAction(action);
          }
          if (action.neverStoreOrLog !== false) {
            this.storeState(newState);;
          }
        });
      }
    }
  }

  public subscribe = (setState: (state: T) => void) =>
    this.subject.subscribe(setState);

  public asObservable = () => this.subject.asObservable();

  public async dispatch<P>(action: ActionType<T, P>): Promise<T> {
    const oldState = this.currentState();
    const newState =  await action.execute(this.ctx);
    if (this.devTools && this.devToolsDispacher) {
      this.devToolsDispacher(action, newState);
    }
    for (const callback of this.callbacks) {
      callback(
        JSON.parse(JSON.stringify(action)) as ActionType<T, P>,
        oldState,
        newState,
        this.storeContext
      );
    }
    return newState;
  }

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

  storeAction = (action: ActionType<T, unknown>) => {
    let untypedAction = action as any;
    if (this.dataApi) {
      const actionSyncOptions = this.dataApi.syncOptions?.actions;
      if (actionSyncOptions && actionSyncOptions.sync) {
        const currentUserId = this.dataApi.getUserId();
        if (!untypedAction['time']) {
          untypedAction = { ...untypedAction, time: new Date().getTime() };
        }
        if (actionSyncOptions.addUserId && !untypedAction['createdBy']) {
          untypedAction = { ...untypedAction, createdBy: currentUserId };
        }
        if (actionSyncOptions.excludedFields && untypedAction['payload']) {
          for (const excludedField of actionSyncOptions.excludedFields) {
            delete untypedAction['payload'][excludedField];
          }
        }
        this.dataApi.storeAction(untypedAction);
      }
    }
  };

  storeState = (state: T) => {
    let untypedState = state as any;
    if (this.dataApi) {
      const actionSyncOptions = this.dataApi.syncOptions?.state;
      if (actionSyncOptions && actionSyncOptions.sync) {
        const currentUserId = this.dataApi.getUserId();
        if (!untypedState['lastModified']) {
          untypedState = { ...untypedState, lastModified: new Date().getTime() };
        }
        if (actionSyncOptions.addUserId && !untypedState['createdBy']) {
          untypedState = { ...untypedState, createdBy: currentUserId };
        }
        if (actionSyncOptions.excludedFields) {
          for (const excludedField of actionSyncOptions.excludedFields) {
            delete untypedState[excludedField];
          }
        }
        this.dataApi.setState(untypedState);
      }
    }
  };
}
