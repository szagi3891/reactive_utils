import type { ShellDir } from '../ShellDir.ts';
import { dockerGetContainers } from './dockerGetContainers.ts';

export class DockerContainer {

    private name: string | null = null;
    private env: Record<string, string> = {};
    private readonly ports: Array<[number, number]> = [];
    private readonly volumes: Array<[string, string]> = [];
    private command: Array<string> | null = null;

    private constructor(
        private readonly network: string,
        private readonly image: string,
        private readonly tag: string,
    ) {
    }

    static from(network: string, image: string, tag: string): DockerContainer {
        return new DockerContainer(network, image, tag);
    }
    setName(name: string): DockerContainer {
        this.name = name;
        return this;
    }

    setEnv(envName: string, value: string | number | boolean): DockerContainer {
        if (typeof this.env[envName] !== 'undefined') {
            throw Error(`Duplicate ${envName}`);
        }

        this.env[envName] = value.toString();
        return this;
    }

    setPort(hostPort: number, containerPort: number): DockerContainer {
        this.ports.push([hostPort, containerPort]);
        return this;
    }

    setVolumes(hostPath: string, containerPath: string): DockerContainer {
        this.volumes.push([hostPath, containerPath]);
        return this;
    }

    setCommand(command: Array<string>): DockerContainer {
        if (this.command !== null) {
            throw Error('Duplicate command');
        }

        this.command = command;
        return this;
    }

    async create(shell: ShellDir) {
        const args: Array<string> = ['run', '-d'];

        if (this.name !== null) {
            args.push('--name');
            args.push(this.name);
        }

        args.push('--network');
        args.push(this.network);

        for (const [name, value] of Object.entries(this.env)) {
            args.push('-e');
            args.push(`${name}=${value}`);
        }

        for (const [hostPort, containerPath] of this.ports) {
            args.push('-p');
            args.push(`${hostPort.toString()}:${containerPath.toString()}`);
        }
        
        for (const [hostPath, containerPath] of this.volumes) {
            args.push('-v');
            args.push(`${hostPath}:${containerPath}`);
        }

        if (this.command !== null) {
            args.push(...this.command);
        }

        args.push(`${this.image}:${this.tag}`);

        console.info('tworzę kontener', {
            command: 'docker',
            args
        });

        await shell.exec({
            command: 'docker',
            args
        });
    }

    async stopIfRun(shell: ShellDir) {
        const images = await dockerGetContainers(shell);
        
        const imageToStop = images.find(image => image.Names === this.name);

        if (imageToStop === undefined) {
            return;
        }

        await shell.exec({
            command: 'docker',
            args: ['stop',imageToStop.ID],
        });
    }

    async removeIfExist(shell: ShellDir) {
        const images = await dockerGetContainers(shell);
        
        const imageToStop = images.find(image => image.Names === this.name);

        if (imageToStop === undefined) {
            return;
        }

        await shell.exec({
            command: 'docker',
            args: ['rm',imageToStop.ID],
        });
    }

    async createForce(shell: ShellDir) {
        await this.stopIfRun(shell);
        await this.removeIfExist(shell);
        await this.create(shell);
    }
}
