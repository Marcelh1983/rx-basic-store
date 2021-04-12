import { BehaviorSubject, Observable, Subscription } from 'rxjs';

export interface StoreType<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: (setState: ((state: T) => void)) => Subscription;
    asObservable: Observable<T>;
    dispatch: (action: ActionType<T, unknown>) => Promise<T>;
    currentState: () => T;
    addCallback: (callback: (action: ActionType<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void) => void
}

export interface ActionType<T, P> {
    type: string;
    payload?: P;
    execute: (ctx: StateContextType<T>) => Promise<T>;
}

export interface StateContextType<T> {
    getContext: <ContextType> (name: string) => ContextType;
    dispatch: (action: ActionType<T, unknown>) => Promise<T>;
    getState: () => T;
    setState: (state: T) => Promise<T>;
    patchState: (state: Partial<T>) => Promise<T>;
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

export class StateContext<T> implements StateContextType<T>  {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(public ctx: BehaviorSubject<T>) { }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch = (action: ActionType<T, unknown>) => action.execute(this as any); // trick compiler here
    getContext<T2>(name: string) {
        return storeContext.get(name) as T2;
    }
    getState = () => this.ctx.getValue();

    setState = (state: T) => {
        const updatedState = { ...state };
        this.ctx.next(updatedState);
        return Promise.resolve(updatedState);
    }
    patchState = (state: Partial<T>) => {
        const current = this.ctx.getValue();
        const merged = { ...current, ...state } as T;
        this.ctx.next(merged);
        return Promise.resolve(merged);
    }
}

export function createStore<T>(initialState: T, devTools = false, context: { ctx: StateContextType<T>, subject: BehaviorSubject<T> } | null = null): StoreType<T> {
    const subject = context ? context.subject : new BehaviorSubject<T>(initialState);
    const ctx = context ? context.ctx : new StateContext(subject);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let devToolsDispacher: any = null;
    if (devTools) {
        devToolsDispacher = getDevToolsDispatcher(subject.getValue());
    }
    const callbacks: ((action: ActionType<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void)[] = [];

    const store: StoreType<T> = {
        subscribe: (setState) => subject.subscribe(setState),
        asObservable: subject.asObservable(),
        dispatch: async (action: ActionType<T, unknown>) => {
            const newState = await action.execute(ctx);
            if (devTools && devToolsDispacher) {
                devToolsDispacher(action, newState);
            }
            for (const callback of callbacks) {
                callback(JSON.parse(JSON.stringify(action)) as ActionType<T, unknown>, ctx.getState(), newState, storeContext);
            }
            return newState;

        },
        currentState: () => subject.getValue(),
        addCallback: (callback: (action: ActionType<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void) => {
            callbacks.push(callback);
        }

    }
    ctx.dispatch = store.dispatch;
    return store;
}

function getDevToolsDispatcher<T>(currentState: T) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({});
    devTools?.init(currentState);

    return function (action: ActionType<T, unknown>, currentState: T) {
        devTools?.send(action.type, currentState);
    };
}

