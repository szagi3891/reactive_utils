import { Result } from '../Result';

export const ChildTrait = Symbol();

export const FormModelTrait = Symbol();

export interface ChildType {
    isVisited: () => boolean;
    setAsVisited: () => void;
    get isModified(): boolean;
    reset: () => void;
}

export interface FormModelType<V> extends ChildType {
    get result(): Result<V, Array<FormErrorMessage>>; //na tym będzie odpowiedni getter dla widoku
    get errorForView(): string | null;
}

// class AA<T> {
//     [ChildTrait](): ChildType {
//         throw Error('');
//     }
//
//     [FormModelTrait](): FormModelType<T> {
//         throw Error('');
//     }
// }




/*
    zrobić dodatkowe pole, które będzie zwracało tablicę z lokalizacjami wystąpienia błędu w wynikowym jsonie

    [{ path: "path1", message: "komunikat błedu", isVisited: boolean }, { path: "path2", message: "message2", isVisited: boolean }]
    
    dopiero na samym końcu, na podstawie wszystkich błędów, mozna podjąć decyzję, o tym, czy wyświetlać zbiorcze komunikaty o błędach


    error dla widoku, moze być wyliczany z tego co jest zwracane
*/


export class FormErrorMessage {
    public constructor(
        public readonly path: Array<string>,
        public readonly isVisited: boolean,
        public readonly message: string,
    ) {}

    public unshiftPath(prefix: string): FormErrorMessage {
        const newPath = [prefix, ...this.path];
        return new FormErrorMessage(newPath, this.isVisited, this.message);
    }
}

//widok grupy ma za zadanie obsłuzyc swoje komunikaty z błędem, czyli te, które mają path === []
export const errorForView = (errors: Array<FormErrorMessage>): string | null => {
    for (const message of errors) {
        if (message.isVisited && message.path.length === 0) {
            return message.message;
        }
    }

    return null;
};

