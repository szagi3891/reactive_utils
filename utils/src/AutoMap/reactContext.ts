import React from "react";
import { AutoWeakRef } from "./AutoWeakMap.ts";

export class AutoWeakMapReactContext<Common> {

    public readonly contextCommon = React.createContext<Common | null>(null);

    public readonly useCommon = (): Common => {
        const state = React.useContext(this.contextCommon);

        if (state === null) {
            throw Error('Missing provider from Common');
        }

        return state;
    };

    public readonly useCreateCommon = (create: (autoWeakRef: AutoWeakRef) => Common) => {
        const [autoWeakRef, deref] = AutoWeakRef.create();
        React.useState(AutoWeakRef.symbolDeref(deref));

        const [ common ] = React.useState(create(autoWeakRef));
        return common;
    }

    public readonly Provider = (props: ({ value: Common, children: React.ReactNode })): React.ReactElement => {
        return (
            React.createElement(
                this.contextCommon.Provider,
                {
                    value: props.value
                },
                [
                    props.children
                ]
            )
        );
    }
}