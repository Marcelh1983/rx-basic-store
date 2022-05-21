# rx-basic-store

A simple reactive store for state management using RxJs. 
Can be used in React, Angular and other frameworks.
When providing a ```dataApi``` implentation you can automatically sync stata to for example firebase [(example)](https://github.com/Marcelh1983/rx-basic-store/tree/main/packages/example/src/app/api-examples/firebase-api.ts) or localStorage [(example)](https://github.com/Marcelh1983/rx-basic-store/tree/main/packages/example/src/app/api-examples/localstorage-api.ts).

Created to seperate state management from the UI components without a lot of boilerplate code.

Inspired by this [blog](https://blog.logrocket.com/rxjs-with-react-hooks-for-state-management/) and the names of the events
are inspired by [ngxs](https://www.ngxs.io)



## Examples

Here a [demo](https://rx-basic-store.web.app/) and the [code](https://github.com/Marcelh1983/rx-basic-store/tree/main/apps/example) 

### create
```typescript
// creates a new store
const store = new Store<ActivityStateModel>(initialState, !environment.production);
```
In reactJs you can add the store in a ```useRef``` if you use the store in a single component or an ```useContext``` when using it is multiple components. The store can be mapped to the component state like this:

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
- ```constructor: (initialState: T = The initial state, devTools: boolean (connect to redux devTools), dataApi?``` = 
- ```addCallback: (callback: (action: ActionType<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void) => void```  can be to add a callback function that captures all actions. For example to log all actions to the console or database.
- ```dispatch: (action: StoreAction<T, unknown>) => Promise<T>```: dispatches an action and return a promise with the new state
- ```currentState```: returns the current state.
- ```asObservable```: return an observable of T

ctx: StateContext<StateModel>
- ```getContext<T2>(name: string)```: gets the context that is added while creating the store. E.g. use to access History *
- ```dispatch: (action: StoreAction<T, unknown>) => Promise<T>```: dispatches an action and return a promise with the new state
- ```getState```: gets the current state.
- ```setState```: set the entire new state.
- ```patchState```: set only the changed properties of the state, these will be merged with the current state.

dataApi: Optionally you can pass a dataApi implementation to automatically store the state. Examples can be found [here](https://github.com/Marcelh1983/rx-basic-store/tree/main/packages/example/src/app/api-examples).
-  ```syncOptions```
  - ```state```: state can be stored automatically:
    - ```sync: boolean```: indicates if the state has to be stored
    - ```collectionName```: name of the collection or table where the data will be stored. (default: state)
    - ```addUserId```: add a createdBy field in the state
    - ```excludedFields```: exclude fields from the state that you don't want to store in the database.
  - ```action```: all actions including payload can be stored too e.g. to analyse the use of your application.
    - ```sync```: indicates if actions should ben stored
    - ```collectionName```: name of the collection or table where the data will be stored. (default: actions)
    - ```addUserId```: add a createdBy field in the action
    - ```excludedFields```: exclude fields from the action payload that you don't want to store in the database.
- ```getUserId: () => string```: get the userId of the logged in user.
- ```getState: () => Promise<T>```: returns the stored state
- ```setState: (doc: T) => Promise<void>```: stores the state
- ```storeAction<P>(action: ActionType<T, P>): void```; stores an action

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