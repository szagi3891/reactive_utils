
export interface SpawnArgsType {
    command: string,
    args: Array<string>,
    sshLogin: string | null,
    cwd: string,
    env: Record<string, string | undefined>,
}

export interface SpanwArgsToRun {
    command: string,
    args: Array<string>,
    // sshLogin: string | null,
    cwd?: string,
    env: Record<string, string | undefined>,
    input?: string,
}

const encodeValue = (value: string): string => {
    const escaped = value.replaceAll('"', '\\"').replaceAll("'", "\"");
    return escaped;
};

export const convertArgs = (args: SpawnArgsType): SpanwArgsToRun => {
    if (args.sshLogin === null) {
        return args;
    }

    const input: Array<string> = [];

    for (const [ key, value ] of Object.entries(args.env)) {
        if (value === undefined) {
            continue;
        }

        input.push(`export ${key}="${encodeValue(value)}"`);
    }
    
    input.push(`cd "${encodeValue(args.cwd)}"`);
    input.push(
        [
            args.command,
            ...args.args.map(encodeValue).map(item => `"${item}"`)
        ].join(' ')
    );

    return {
        command: 'ssh',
        // args: [args.sshLogin, '\'bash -s\''],
        args: [args.sshLogin, 'bash'],
        env: {},
        input: input.join('\n'),
    }
};
