import type { FormNode} from '@reactive/utils';
import { Value } from '@reactive/utils';

type SubmitResult = {
    type: 'ok'
} | {
    type: 'ignore-event',
} | {
    type: 'error-message',
    message: string,
}

export class FormState<P> {
    public isProcessingValue: Value<boolean> = new Value(false);

    public get isProcessing(): boolean {
        return this.isProcessingValue.getValue();
    }

    constructor(private readonly node: FormNode<P>,) {}

    public get jsx(): React.ReactNode {
        return this.node.jsx;
    }

    public get isValid(): boolean {
        return this.node.value.isValid;
    }

    public get isModified(): boolean {
        return this.node.value.isModified;
    }

    public reset() {
        this.node.value.reset();
    }

    submit = async (
        onSubmit: (data: P) => Promise<string | null>,
    ): Promise<SubmitResult> => {
        this.node.value.setAsVisited();

        if (this.isProcessing) {
            return {
                type: 'ignore-event'
            };
        }

        this.isProcessingValue.setValue(true);

        try {
            const result = this.node.value.result;

            if (result.type === 'ok') {
                const response = await onSubmit(result.data);

                if (response === null) {
                    return { type: 'ok' };
                }

                return {
                    type: 'error-message',
                    message: response
                };
            } else {

                console.error(result.error);
                return {
                    type: 'error-message',
                    message: `From result.type === false -> ${JSON.stringify(result.error, null, 4)}`
                };
            }
        } finally {
            this.isProcessingValue.setValue(false);
        }
    }
}

