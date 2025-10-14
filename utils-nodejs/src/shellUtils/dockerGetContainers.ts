import { CheckByZod } from "@reactive/utils";
import type { ShellDir } from "../ShellDir.ts";
import z from "zod";

const PsLineZod = z.object({
    ID: z.string(),
    Image: z.string(),
    CreatedAt: z.string(),
    Status: z.string(),
    Ports: z.string(),
    Labels: z.string(),
    Names: z.string(),
    State: z.enum(['created', 'restarting', 'running', 'removing', 'paused', 'exited', 'dead'])
    // Repository: z.string(),
    // Tag: z.string(),
    // CreatedSince: z.string(),
    // VirtualSize: z.string(),
});

// created	Kontener został utworzony, ale jeszcze nie wystartował (docker create).
// restarting	Kontener jest w trakcie restartu (np. po crashu z --restart).
// running	Kontener działa (proces główny aktywny).
// removing	Kontener jest w trakcie usuwania (docker rm w toku).
// paused	Kontener jest zatrzymany sygnałem PAUSE (docker pause).
// exited	Kontener zakończył się (proces zakończył działanie, ale kontener istnieje).
// dead	Kontener jest w stanie niespójnym / uszkodzonym (Docker nie może go w pełni usunąć).

const PsLineCheck = CheckByZod.create('PsLineCheck', PsLineZod);

type PsLineType = z.TypeOf<typeof PsLineZod>;

export const dockerGetContainers = async (shell: ShellDir): Promise<Array<PsLineType>> => {

    const data = await shell.execAndGet({
        command: 'docker',
        args: ['ps', '-a', '--format', '{{json .}}']
    });

    const safeData = PsLineCheck.ndjsonParse(data);

    if (safeData.type === 'error') {
        throw Error(safeData.error.stringifySort());
    }

    return safeData.data;
};
