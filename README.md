# rx-basic-store

A simple reactive store for state management using RxJs. 
Can be used in React but will also work with other frameworks.

Created to seperate state management from the UI components without a lot of boilerplate code.

Inspired by this [blog](https://blog.logrocket.com/rxjs-with-react-hooks-for-state-management/) and the names of the events
are inspired by [ngxs](https://www.ngxs.io)

## Examples

Here a [demo](https://rx-basic-store.web.app/) and the code [code](https://github.com/Marcelh1983/rx-basic-store/tree/main/apps/example) 

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
