import { MockedDataApi } from './mocked-api.test';
import { Store } from './store';
import { ActionType, StateContextType } from './types';

interface StateModel {
  loading: boolean;
  users: string[];
}

const syncAll = {
  actions: {
    addUserId: true,
    collectionName: 'actions',
    sync: true,
  },
  state: {
    addUserId: true,
    collectionName: 'state',
    sync: true,
  },
};

const syncNone = {
  actions: {
    sync: false,
  },
  state: {
    sync: false,
  },
};
interface ExtendedStateModel extends StateModel {
  extra: boolean;
}

const initialState: StateModel = {
  loading: true,
  users: [],
};
class LoadAction<T extends StateModel> implements ActionType<T, never> {
  type = 'LOAD';
  async execute(ctx: StateContextType<T>): Promise<T> {
    const currentState = ctx.getState();
    if (currentState.users.length === 0) {
      // help the compiler a bit with types
      const patchedState: Partial<StateModel> = {
        loading: false,
        users: ['user1', 'user2'],
      };
      return await ctx.patchState(patchedState as T);
    }
    return currentState;
  }
}

describe(`rx-basic-store`, () => {
  it('initial state set', async () => {
    const store = new Store<StateModel>(initialState, false);
    expect(store.currentState()).toEqual(initialState);
  });

  it('action changes state', async () => {
    const store = new Store<StateModel>(initialState, false);
    const currentState = await store.dispatch(new LoadAction());

    expect(currentState.loading).toEqual(false);
    expect(currentState.users.length).toEqual(2);
    expect(currentState).toEqual(store.currentState());
  });

  it('callback is called', async () => {
    const store = new Store<StateModel>(initialState, false);

    let oldState: StateModel | null = null;
    let newState: StateModel | null = null;
    const callback = (
      action: ActionType<StateModel, unknown>,
      os: StateModel,
      nw: StateModel,
      context: Map<string, unknown>
    ) => {
      oldState = os;
      newState = nw;
    };
    const callBackSpy = jest.fn(callback);
    store.addCallback(callBackSpy);
    await store.dispatch(new LoadAction());
    expect(JSON.stringify(oldState)).toEqual(JSON.stringify(initialState));
    expect(JSON.stringify(newState)).toEqual(
      JSON.stringify(store.currentState())
    );
    expect(callBackSpy).toHaveBeenCalledTimes(1);
  });

  it('can work with extended classes', async () => {
    const extInitialState = { ...initialState, extra: true };
    const store = new Store<ExtendedStateModel>(extInitialState, false);
    expect(store.currentState()).toEqual(extInitialState);
    const currentState = await store.dispatch(new LoadAction());

    expect(currentState.loading).toEqual(false);
    expect(currentState.users.length).toEqual(2);
    expect(currentState.extra).toEqual(true);
  });

  it('data api stores state', async () => {
    const dataApi = new MockedDataApi<StateModel>(
      syncAll,
      'user-123',
      initialState
    );
    const mock = jest.spyOn(dataApi, 'setState');
    const store = new Store<StateModel>(initialState, false, dataApi);
    const currentState = await store.dispatch(new LoadAction());

    expect(currentState.loading).toEqual(false);
    expect(currentState.users.length).toEqual(2);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('data api adds user id', async () => {
    const userId = 'user-123';
    const dataApi = new MockedDataApi<StateModel>(
      syncAll,
      userId,
      initialState
    );
    // const mock = jest.spyOn(dataApi, 'setState');
    const store = new Store<StateModel>(initialState, false, dataApi);
    await store.dispatch(new LoadAction());
    expect((dataApi.latestState as any)['createdBy']).toEqual(userId);
  });

  it('data api does not add user id', async () => {
    const userId = 'user-123';
    const dataApi = new MockedDataApi<StateModel>(
      { ...syncAll, state: { ...syncAll.state, addUserId: false } },
      userId,
      initialState
    );
    // const mock = jest.spyOn(dataApi, 'setState');
    const store = new Store<StateModel>(initialState, false, dataApi);
    await store.dispatch(new LoadAction());
    expect((dataApi.latestState as any)['createdBy']).toEqual(undefined);
  });
});
