import { BehaviorSubject, PartialObserver, Subscription } from 'rxjs';

export interface Store<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: (setState: any) => Subscription;
    dispatch: (action: StoreAction<T, unknown>) => Promise<T>;
    currentState: () => T;
    callback?: (action: StoreAction<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void
}

export interface StoreAction<M, T> {
    type: string;
    payload?: T;
    execute(subject: StateContext<M>): | Promise<M>;
}

const storeContext = new Map<string, unknown>();

export const setStoreContext = (context: { name: string, dependency: unknown }[]) => {
    context.forEach(c => {
        if (storeContext.get(c.name)) {
            console.warn(`${c.name} is already added in the store context. Overriding current value`);
        }
        storeContext.set(c.name, c.dependency);
    });
};

export class StateContext<T> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(public subject: BehaviorSubject<T>) { }

    getContext<T2>(name: string) {
        return storeContext.get(name) as T2;
    }
    // eslint-disable-next-line  
    dispatch = (action: StoreAction<T, unknown>) => action.execute(this);

    getState = () => this.subject.getValue();

    setState(state: T) {
        const updatedState = { ...state };
        this.subject.next(updatedState);
        return Promise.resolve(updatedState);
    }
    patchState(state: Partial<T>) {
        const current = this.subject.getValue();
        const merged = { ...current, ...state } as T;
        this.subject.next(merged);
        return Promise.resolve(merged);
    }
}

export function createStore<T>(initialState: T, devTools = false): Store<T> {
    const subject = new BehaviorSubject<T>(initialState);
    const ctx = new StateContext(subject);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let devToolsDispacher: any = null;
    if (devTools) {
        devToolsDispacher = getDevToolsDispatcher(subject.getValue());
    }

    const store: Store<T> = {
        subscribe: (setState: PartialObserver<T> | undefined) => subject.subscribe(setState),
        dispatch: async (action: StoreAction<T, unknown>) => {
            const newState = await action.execute(ctx);
            if (devTools && devToolsDispacher) {
                devToolsDispacher(action, newState);
            }
            if (store.callback) {
                store.callback(JSON.parse(JSON.stringify(action)) as StoreAction<T, unknown>, ctx.getState(), newState, storeContext);
            }
            return newState;

        },
        currentState: () => subject.getValue(),
        callback: undefined
    }
    ctx.dispatch = store.dispatch;
    return store;
}

function getDevToolsDispatcher<T>(currentState: T) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({});
    devTools?.init(currentState);

    return function (action: StoreAction<T, unknown>, currentState: T) {
        devTools?.send(action.type, currentState);
    };
}

