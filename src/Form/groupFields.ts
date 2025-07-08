import type { FormModel } from "./FormModel.ts";
import { FormNode } from "./FormNode.ts";
import React from "react";

interface RenderRowType {
    fieldId: string,
    label: string,
    jsx: React.ReactElement
}

interface Params<P extends Record<keyof P, FormNode<unknown>>,> {
    model: P,
    labels: {
        readonly [K in keyof P]: string;
    },
    renderRow: (params: RenderRowType) => React.ReactElement,
}

export const groupFields = <P extends Record<keyof P, FormNode<unknown>>,>(params: Params<P>): FormNode<{
    readonly [K in keyof P]: P[K] extends FormNode<infer R> ? R : never;
}> => {
    const {model, labels, renderRow } = params;

    const group: FormModel<{
        readonly [K in keyof P]: P[K] extends FormNode<infer R> ? R : never;
    }> = FormNode.group(model);

    const result = [];

    for (const [fieldId, field] of Object.entries(model)) {
        //@ts-expect-error ...
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const label: string = labels[fieldId];

        //@ts-expect-error ...
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsx: React.ReactElement = field.jsx;

        const row = renderRow({ fieldId, label, jsx });

        const rowWithKey = React.cloneElement(row, { key: fieldId });

        result.push(rowWithKey);
    }

    const jsx = React.createElement(React.Fragment, null, result);

    return new FormNode(group, jsx);
}
