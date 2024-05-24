/** @jsx createElement */
import { createElement } from 'react';
import { makeObservable, observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import * as React from 'react';

class State {
    @observable counter: number = 1;

    constructor() {
        makeObservable(this);
    }

    up = () => {
        this.counter+= 1;
    }
}

export const TestComponent: (() => JSX.Element) = observer(() => {
    const [ state ] = React.useState(() => new State());

    return (
        <div onClick={state.up}>
            Test Component {state.counter}
        </div>
    )
});
