# rx-basic-store

A simple reactive store for state management using RxJs. 
Can be used in React but will also work with other frameworks.

Created to seperate state management from the UI components without a lot of boilerplate code.

Inspired by this [blog](https://blog.logrocket.com/rxjs-with-react-hooks-for-state-management/) and the names of the events
are inspired by [ngxs](https://www.ngxs.io)

If you want to use this package with firebase, please use [rx-firebase-store](https://www.npmjs.com/package/rx-firebase-store) which is build on top of this package and let you auto store state, store action, easy access functions, firestore etc.

## Examples

Here a [demo](https://rx-basic-store.web.app/) and the [code](https://github.com/Marcelh1983/rx-basic-store/tree/main/apps/example) 

### create
```typescript
// creates a new store
const store = createStore<ActivityStateModel>(initialState, !environment.production);
```
In reactJs the store can be mapped to the component state like this:

```typescript
export function MyComponent() {
  const [state, setState] = useState(store.currentState());

  useEffect(() => {
    const subs = store.subscribe(setState);
    store.dispatch(new LoadAction());
    return subs.unsubscribe;
  }, []);
```

### actions

Create an action that implements StoreAction<T, M>

```typescript
export class LoadAction implements StoreAction<StateModel, never> {
    type = "LOAD";
    async execute(ctx: StateContext<StateModel>): Promise<StateModel> {
        if (ctx.getState().users.length === 0) {
            ctx.patchState({ loading: true });
            const users = (await axios.get<ApiResponse>('https://randomuser.me/api/?results=20')).data.results;
            return ctx.patchState({ loading: false, users });
        }
    }
}
```
### API

Store:
- constructor: (initialState: T = The initial state, devTools: boolean = connect to redux devTools)
- addCallback: (callback: (action: ActionType<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void) => void  can be to add a callback function that captures all actions. For example to log all actions to the console or database.
- dispatch: (action: StoreAction<T, unknown>) => Promise<T>: dispatches an action and return a promise with the new state
- currentState: returns the current state.
- asObservable: return an observable of T

ctx: StateContext<StateModel>
- getContext<T2>(name: string): gets the context that is added while creating the store. E.g. use to access History *
- dispatch: (action: StoreAction<T, unknown>) => Promise<T>: dispatches an action and return a promise with the new state
- getState: gets the current state.
- setState: set the entire new state.
- patchState: set only the changed properties of the state, these will be merged with the current state.

* To use getContext() you have to set the dependency somewhere where it is available:

```typescript
  setStoreContext([
    { name: 'history', dependency: useHistory() }
  ])
```

In the action you can use: 

```typescript
  const history = ctx.getContext<History>('history');
```