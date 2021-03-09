import { BehaviorSubject } from 'rxjs';

export interface StoreAction<M, T> {
    type: string;
    payload?: T;

    customProperties?: Array<{ key: string, value: string }>;
    execute(subject: StateContext<M>): void | Promise<M>;
}

export class StateContext<T> {
    constructor(public subject: BehaviorSubject<T>) { }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dispatch: (action: StoreAction<T, unknown>) => Promise<void | T>;

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

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function createStore<T>(initialState: T, actionCallback: (action: StoreAction<T, unknown>) => void = () => { }, devTools = false) {
    const subject = new BehaviorSubject<T>(initialState);
    const ctx = new StateContext(subject);
    let devToolsDispacher = null;
    if (devTools) {
        devToolsDispacher = getDevToolsDispatcher(subject.getValue());
    }
    const store = {
        subscribe: (setState) => subject.subscribe(setState),
        dispatch: async (action: StoreAction<T, unknown>) => {
            if (actionCallback) {
                actionCallback(JSON.parse(JSON.stringify(action)) as StoreAction<T, unknown>);
            }
            if (devTools && devToolsDispacher) {
                const newState = await action.execute(ctx);
                devToolsDispacher(action, newState);
                return newState;
            } else {
                return action.execute(ctx);
            }

        },
        currentState: () => subject.getValue()
    }
    ctx.dispatch = store.dispatch;
    return store;
}

function getDevToolsDispatcher<T>(currentState: T) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({});
    devTools.init(currentState);

    return function (action: StoreAction<T, unknown>, currentState: T) {
        devTools.send(action.type, currentState);
    };
}

