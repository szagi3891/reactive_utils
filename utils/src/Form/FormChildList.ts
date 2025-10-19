import { FormChildTrait, FormChildType } from "./FormTypes.ts";

export class FormChildList {

    constructor(private readonly child: Array<{[FormChildTrait](): FormChildType}>) {
    }

    public setAsVisited(): void {
        for (const child of this.child) {
            child[FormChildTrait]().setAsVisited();
        }
    }

    public isVisited(): boolean {
        for (const item of this.child) {
            if (item[FormChildTrait]().isVisited() === false) {
                return false;
            }
        }

        return true;
    }

    public get isModified(): boolean {
        for (const item of this.child) {
            if (item[FormChildTrait]().isModified) {
                return true;
            }
        }

        return false;
    }

    public reset(): void {
        for (const item of this.child) {
            item[FormChildTrait]().reset();
        }
    }
}

