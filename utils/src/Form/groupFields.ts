import type { FormModel } from "./FormModel.ts";
import { FormNode } from "./FormNode.ts";
import React from "react";
import { typedEntries2 } from "./typedEntries2.ts";

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
    renderWrapper?: (jsx: React.ReactElement) => React.ReactElement,
}

export const groupFields = <P extends Record<string, FormNode<unknown>>,>(params: Params<P>): FormNode<{
    readonly [K in keyof P]: P[K] extends FormNode<infer R> ? R : never;
}> => {
    const {model, labels, renderRow, renderWrapper } = params;

    const group: FormModel<{
        readonly [K in keyof P]: P[K] extends FormNode<infer R> ? R : never;
    }> = FormNode.group(model);

    const result: Array<React.ReactElement> = [];

    typedEntries2(model, (fieldId, field) => {
        const label: string = labels[fieldId];
        const jsx: React.ReactElement = field.jsx();

        const row = renderRow({ fieldId, label, jsx });
        const rowWithKey = React.cloneElement(row, { key: fieldId });
        result.push(rowWithKey);
    })

    const jsx = React.createElement(React.Fragment, null, result);

    if (renderWrapper === undefined) {
        return new FormNode(group, () => jsx);
    } else {
        return new FormNode(group, () => renderWrapper(jsx));
    }
}
