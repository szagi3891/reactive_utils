import * as React from 'react';

interface PropsType {
    name: string,
    title?: string,
    className?: string,
    src?: string,
    onMessage?: (data: unknown) => void,
    onLoad: () => void,
    dataTest?: string
}

export class Iframe extends React.Component<PropsType> {
    private ref: HTMLIFrameElement | null = null;

    private onMessage = (event: MessageEvent): void => {
        if (this.ref !== null) {
            if (this.ref.contentWindow === event.source) {
                if (this.props.onMessage !== undefined) {
                    this.props.onMessage(event.data);
                }
            }
        }
    }

    public componentDidMount(): void {
        window.addEventListener('message', this.onMessage);
    }

    public componentWillUnmount(): void {
        window.removeEventListener('message', this.onMessage);
    }

    public setRef = (ref: HTMLIFrameElement | null): void => {
        this.ref = ref;
    }

    public render(): JSX.Element {
        const { className, src, name, onLoad, title, dataTest } = this.props;

        return (
            <iframe
                className={className}
                name={name}
                src={src}
                ref={this.setRef}
                onLoad={onLoad}
                title={title}
                data-test={dataTest}
            />
        );
    }
}
