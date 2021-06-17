
import axios from 'axios';
import { ApiResponse, User } from './model';
import { ActionType, createStore, StateContextType } from 'rx-firebase-store';

export type genderType = 'none' | 'female' | 'male' | 'other';
export interface StateModel {
    loading: boolean;
    users: User[];
    genderFilter: genderType;
    filter: (user: User) => boolean
}
const initialState: StateModel = {
    loading: true,
    users: [],
    genderFilter: 'none',
    filter: (u) => true
};

export class LoadAction implements ActionType<StateModel, never> {
    type = "LOAD";
    async execute(ctx: StateContextType<StateModel>): Promise<StateModel> {
        if (ctx.getState().users.length === 0) {
            ctx.patchState({ loading: true });
            const users = (await axios.get<ApiResponse>('https://randomuser.me/api/?results=20')).data.results;
            return ctx.patchState({ loading: false, users });
        }
    }
}

export class FilterAction implements ActionType<StateModel, { gender: genderType }> {
    type = "FILTER";

    constructor(public payload: { gender: genderType }) { }

    async execute(ctx: StateContextType<StateModel>): Promise<StateModel> {
        return ctx.patchState({
            genderFilter: this.payload.gender,
            filter: user => user.gender === this.payload.gender
        });
    }
}

export class ClearFilterAction implements ActionType<StateModel, never> {
    type = "FILTER_CLEAR";

    async execute(ctx: StateContextType<StateModel>): Promise<StateModel> {
        return ctx.patchState({
            genderFilter: initialState.genderFilter,
            filter: initialState.filter
        });
    }
}

const store = createStore<StateModel>(initialState, true);

export default store;
