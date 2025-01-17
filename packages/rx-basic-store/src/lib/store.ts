import { BehaviorSubject } from 'rxjs';
import { StateContext } from './context';
import { DataApi } from './data-api';
import { StoreType, ActionType } from './types';
import { getDevToolsDispatcher } from './utils';

export class Store<T> implements StoreType<T> {
  public ctx!: StateContext<T>;
  protected subject!: BehaviorSubject<T>;
  protected devToolsDispacher: any;
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
    private dataApi?: DataApi<T>,
    context?: Map<string, unknown>
  ) {
    this.subject = new BehaviorSubject<T>(initialState);
    this.storeContext = context || new Map<string, unknown>();
    this.ctx = new StateContext<T>(
      this.subject,
      this.storeContext,
      initialState,
      dataApi
    );
  }

  public subscribe = (setState: (state: T) => void) =>
    this.subject.subscribe(setState);

  public asObservable = () => this.subject.asObservable();

  public async dispatch<P>(action: ActionType<T, P>): Promise<T> {
    const oldState = this.currentState();
    const newState = await action.execute(this.ctx);
    if (this.devTools) {
      if (!this.devToolsDispacher) {
        this.devToolsDispacher = getDevToolsDispatcher(oldState);
      }
      if (this.devToolsDispacher) {
        this.devToolsDispacher(action, newState);
      }
    }

    if (this.callbacks?.length > 0) {
      this.handleActionCallbacks(action, oldState, newState);
    }

    if (!action.neverStoreOrLog) {
      if (this.dataApi && this.dataApi.syncOptions.actions?.sync) {
        this.storeAction(action);
      }
      if (this.dataApi && this.dataApi.syncOptions.state?.sync) {
        await this.storeState(newState);
      }
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
    let untypedAction = { ...action } as any;
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

  handleActionCallbacks = (
    action: ActionType<T, unknown>,
    oldState: T,
    newState: T
  ) => {
    try {
      const clonedAction = JSON.parse(JSON.stringify(action)) as ActionType<
        T,
        unknown
      >;
      for (const callback of this.callbacks) {
        callback(clonedAction, oldState, newState, this.storeContext);
      }
    } catch {
      try {
        for (const callback of this.callbacks) {
          callback(
            { type: action.type } as ActionType<T, unknown>,
            oldState,
            newState,
            this.storeContext
          );
        }
      } catch {
        //ignore
      }
    }
  };

  storeState = async (state: T) => {
    let untypedState = { ...state } as any;
    if (this.dataApi) {
      const stateSyncOptions = this.dataApi.syncOptions?.state;
      if (stateSyncOptions && stateSyncOptions.sync) {
        const currentUserId = this.dataApi.getUserId();
        if (!untypedState['lastModified']) {
          untypedState = {
            ...untypedState,
            lastModified: new Date().getTime(),
          };
        }
        if (stateSyncOptions.addUserId && !untypedState['createdBy']) {
          untypedState = { ...untypedState, createdBy: currentUserId };
        }
        if (stateSyncOptions.excludedFields) {
          for (const excludedField of stateSyncOptions.excludedFields) {
            delete untypedState[excludedField];
          }
        }
        await this.dataApi.setState(untypedState);
      }
    }
  };
}
