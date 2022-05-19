import { FirebaseOptions } from 'firebase/app';
import { BehaviorSubject } from 'rxjs';
import { StateContext } from './context';
import {
  ActionType,
  ActionTypePartial,
  Region,
  StoreType,
  SyncOptions,
} from './types';

const defaultSyncOptions: SyncOptions = {
  addUserId: true,
  autoStore: true,
  collectionName: 'state',
  excludedFields: [],
  logAction: true,
};

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
    private firebaseOptions: FirebaseOptions,
    private devTools = false,
    private syncOptions = defaultSyncOptions,
    private region: Region = 'europe-west1'
  ) {
    this.subject = new BehaviorSubject<T>(initialState);
    this.ctx = new StateContext(
      this.subject,
      firebaseOptions,
      this.storeContext,
      region,
      syncOptions
    );
  }

  public subscribe = (setState: (state: T) => void) =>
    this.subject.subscribe(setState);

  public asObservable = this.subject.asObservable();

  public dispatch = async (action: ActionTypePartial<T>): Promise<T> => {
    const newState: T = (await action.execute(this.ctx as any)) as any; // trick compiler here to be able to pass a partial of T
    if (this.devTools && this.devToolsDispacher) {
      this.devToolsDispacher(action, newState);
    }
    for (const callback of this.callbacks) {
      callback(
        JSON.parse(JSON.stringify(action)) as ActionType<T, unknown>,
        this.ctx.getState(),
        newState,
        this.storeContext
      );
    }
    return newState;
  };

  public currentState = () => this.ctx.getState();

  public overrideSyncOptions = (newSyncOptions: Partial<SyncOptions>) => {
    this.syncOptions = { ...this.syncOptions, ...newSyncOptions };
    this.ctx = new StateContext(
      this.subject,
      this.firebaseOptions,
      this.storeContext,
      this.region,
      this.syncOptions
    );
  };

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
