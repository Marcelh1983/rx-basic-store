import { BehaviorSubject, Observable, Subscription } from 'rxjs';

// ABSTRACT TYPES

export interface StoreBaseType<StateType, ActionType extends StoreActionType<StateType, unknown>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: (setState: ((state: StateType) => void)) => Subscription;
    asObservable: Observable<StateType>;
    dispatch: (action: ActionType) => Promise<StateType>;
    currentState: () => StateType;
    addCallback: (callback: (action: ActionType, oldState: StateType, newState: StateType, context: Map<string, unknown>) => void) => void
}

export interface StoreActionBaseType<StateType, PayloadType, ContextType extends StateContextType<StateType, StoreActionBaseType>> {
    type: string;
    payload?: PayloadType;
    execute: (ctx: ContextType) => Promise<StateType>;
}

export interface StateContextType<StateType, ActionType> {
    getContext: <ContextType> (name: string) => ContextType;
    dispatch: (action: ActionType) => Promise<StateType>;
    getState: () => StateType;
    setState: (state: StateType) => Promise<StateType>;
    patchState: (state: Partial<StateType>) => Promise<StateType>;
}

// BASIS STORE TYPES

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StoreActionType<StateType, PayloadType> extends StoreActionBaseType<StateType,PayloadType, StateContext<StateType>> { }
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StoreType<T> extends StoreBaseType<T, StoreActionType<T, unknown>> { }

const storeContext = new Map<string, unknown>();

export const setStoreContext = (context: { name: string, dependency: unknown }[]) => {
    context.forEach(c => {
        if (storeContext.get(c.name)) {
            console.warn(`${c.name} is already added in the store context. Overriding current value`);
        }
        storeContext.set(c.name, c.dependency);
    });
};

export class StateContext<StateType, PayloadType> implements StateContextType<StateType, PayloadType>  {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(public subject: BehaviorSubject<StateType>) { }
    dispatch: (action: PayloadType) => Promise<StateType>;
    dispatch = (action: StoreAction<StateType, unknown>) => action.execute(this);
    getContext<T2>(name: string) {
        return storeContext.get(name) as T2;
    }
    // eslint-disable-next-line  


    getState = () => this.subject.getValue();

    setState = (state: StateType) => {
        const updatedState = { ...state };
        this.subject.next(updatedState);
        return Promise.resolve(updatedState);
    }
    patchState = (state: Partial<StateType>) => {
        const current = this.subject.getValue();
        const merged = { ...current, ...state } as StateType;
        this.subject.next(merged);
        return Promise.resolve(merged);
    }
}

export function createStore<T>(initialState: T, devTools = false, context?: StateContext<T>): Store<T> {
    const subject = new BehaviorSubject<T>(initialState);
    const ctx = context ? context : new StateContext(subject);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let devToolsDispacher: any = null;
    if (devTools) {
        devToolsDispacher = getDevToolsDispatcher(subject.getValue());
    }
    const callbacks: ((action: StoreAction<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void)[] = [];

    const store: Store<T> = {
        subscribe: (setState) => subject.subscribe(setState),
        asObservable: subject.asObservable(),
        dispatch: async (action: StoreAction<T, unknown>) => {
            const newState = await action.execute(ctx);
            if (devTools && devToolsDispacher) {
                devToolsDispacher(action, newState);
            }
            for (const callback of callbacks) {
                callback(JSON.parse(JSON.stringify(action)) as StoreAction<T, unknown>, ctx.getState(), newState, storeContext);
            }
            return newState;

        },
        currentState: () => subject.getValue(),
        addCallback: (callback: (action: StoreAction<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void) => {
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

    return function (action: StoreAction<T, unknown>, currentState: T) {
        devTools?.send(action.type, currentState);
    };
}

