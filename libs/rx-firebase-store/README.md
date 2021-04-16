# rx-firebase-store

A simple reactive store for state management using RxJs. 
Can be used in React but will also work with other frameworks.

Created to seperate state management from the UI components without a lot of boilerplate code.

Inspired by this [blog](https://blog.logrocket.com/rxjs-with-react-hooks-for-state-management/) and the names of the events
are inspired by [ngxs](https://www.ngxs.io)

## Examples

Here a [demo](https://rx-basic-store.web.app/) and the [code](https://github.com/Marcelh1983/rx-basic-store/tree/main/apps/example) 

### init

To init firebase (you can use the store without firebase for e.g. storybook or unittests in that case you don't have to initFirebase).

```typescript
  const initStore = (firebaseApp: firebase.app.App, region?: Region, syncOptions?: SyncOptions)
```
- firebaseApp: firebase.app.App
- region: used to configure the region of the functions
- syncOptions: if logOptions are not null, all actions are logged to firebase.
    - collectionName: the collection where actions are logged 
    - addUserId: if true; added uuid of the user in the createdBy field. 
    - logAction?: boolean; (default: true). If all actions are logged; it can be disabled for a single store. 

#### example

```typescript
  const app = await firebase.initializeApp(environment.firebase, 'database');

  initStore(app, 'europe-west1', {
    collectionName,
    addUserId: true,
  });
``` 

To log all actions to firebase use the logOptions.

Make sure the firebase used parts are imported somewhere in the application

```typescript
import 'firebase/firestore';
import 'firebase/firebase-functions';
import 'firebase/auth';
```

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

- Firebase functions:
  - functions: firebase.functions.Functions
  - firestore: firebase.firestore.Firestore;
  - storage: firebase.storage.Storage;
  - auth: firebase.auth.Auth;

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