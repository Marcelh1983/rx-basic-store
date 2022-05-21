# rx-basic-store

A simple reactive store for state management using RxJs.
Can synchronize state automatically to the database by implementing the IDataApi interface.

Can be used in React and Angular and other frameworks.

Created to seperate state management from the UI components without a lot of boilerplate code.

Inspired by this [blog](https://blog.logrocket.com/rxjs-with-react-hooks-for-state-management/) and the names of the events
are inspired by [ngxs](https://www.ngxs.io)

## rx-basic-store

[rx-basic-store](packages/rx-basic-store)

## rx-firebase-store
this package is deprecated. To have the same result you can use rx-basic-store with a firebase dataApi. With can be found [here](packages/example/src/app/api-examples/firebase-api.ts).
