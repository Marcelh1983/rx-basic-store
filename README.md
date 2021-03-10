# rx-basic-store

A simple reactive store for state management using RxJs. 
Can be used in React but will also work with other frameworks.

Created to seperate state management from the UI components without a lot of boilerplate code.

Inspired by this [blog](https://blog.logrocket.com/rxjs-with-react-hooks-for-state-management/) and the names of the events
are inspired by [ngxs](https://www.ngxs.io)

## Examples

Here a [demo](https://rx-basic-store.web.app/) and the [code](https://github.com/Marcelh1983/rx-basic-store/tree/main/apps/example) 

### create
```typescript
// creates a new store
const store = createStore<StateModel>(initialState, null, true);
```
In reactJs the store can be mapped to the component state like this:

```typescript
export function MyComponent() {
  const [state, setState] = useState(store.currentState());

  useEffect(() => {
    const subs = store.subscribe(setState);
    store.dispatch(new LoadAction());
    return () => subs.unsubscribe();
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
            const users = await (await axios.get<ApiResponse>('https://randomuser.me/api/?results=20')).data.results;
            return ctx.patchState({ loading: false, users });
        }
    }
}
```
### API

Store:
- initialState: T: The initial state
- context (name: string, dependency: unknown }[]): can be used to inject context like: History etc. these context dependencies can be accessed by ctx: ctx.getContext<History<unknown>>('history')
- actionCallback: (action: StoreAction<T, unknown>) => void = () => { }, devTools = false) can be used capture all action. For example to log all actions to the console or database.
- devTools (bool): indicates if the events should be send to redux devTools

ctx: StateContext<StateModel>
- getContext<T2>(name: string): gets the context that is added while creating the store. E.g. use to access History
- dispatch: (action: StoreAction<T, unknown>) => Promise<void | T>: dispatches an action and return a promise, optional with the state, when the action is finished.
- getState: gets the current state.
- setState: set the entire new state.
- patchState: set only the changed properties of the state, these will be merged with the current state.