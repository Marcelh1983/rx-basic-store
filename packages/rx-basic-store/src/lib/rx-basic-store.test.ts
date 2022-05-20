import { Store } from './store';
import { ActionType, StateContextType } from './types';

interface StateModel {
  loading: boolean;
  users: string[];
}

const initialState: StateModel = {
  loading: true,
  users: [],
};
class LoadAction implements ActionType<StateModel, never> {
  type = 'LOAD';
  async execute(ctx: StateContextType<StateModel>): Promise<StateModel> {
    const currentState = ctx.getState();
    if (currentState.users.length === 0) {
      return ctx.patchState({ loading: false, users: ['user1', 'user2'] });
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
    await store.dispatch(new LoadAction());
    expect(store.currentState().loading).toEqual(false);
    expect(store.currentState().users.length).toEqual(2);
  });

  it('callback is called', async () => {
    const store = new Store<StateModel>(initialState, false);

    let oldState: StateModel|null = null;
    let newState:  StateModel|null = null;
    const callback = (action: ActionType<StateModel, unknown>, os: StateModel, nw: StateModel, context: Map<string, unknown>) => {
        oldState = os;
        newState = nw;
    };
    const callBackSpy = jest.fn(callback);
    store.addCallback(callBackSpy)
    await store.dispatch(new LoadAction());
    expect(JSON.stringify(oldState)).toEqual(JSON.stringify(initialState));
    expect(JSON.stringify(newState)).toEqual(JSON.stringify(store.currentState()));
    expect(callBackSpy).toHaveBeenCalledTimes(1);
  });
});
