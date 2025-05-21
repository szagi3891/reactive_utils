import * as React from 'react';
import { FormModel } from "./FormModel.ts";

export class FormNode<T> {
    constructor(
        public readonly value: FormModel<T>,
        public readonly jsx: React.ReactNode,
    ) {}
}

// React.createElement()

