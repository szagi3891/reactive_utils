import { Value } from "../Value.ts";
import { FormNode } from "./FormNode.ts";


export class FormState<P> {
    public isLoadingValue: Value<boolean> = new Value(false);

    public get isLoading(): boolean {
        return this.isLoadingValue.getValue();
    }

    submit = async (
        node: FormNode<P>,
        onSubmit: (data: P) => Promise<string | null>,
        onCancel: () => void,
        onError: (message: string) => void,
    ) => {
        node.value.setAsVisited();

        if (this.isLoading) {
            return;
        }

        this.isLoadingValue.setValue(true);

        try {
            const result = node.value.result;

            if (result.type === 'ok') {
                const response = await onSubmit(result.data);

                if (response === null) {
                    onCancel();
                    node.value.reset();
                    return;
                }

                onError(response);
            } else {

                onError(`From result.type === false -> ${JSON.stringify(result.error, null, 4)}`);
                console.error(result.error);
            }
        } finally {
            this.isLoadingValue.setValue(false);
        }
    }
}

