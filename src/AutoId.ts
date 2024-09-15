export class AutoId { 
    private id: number = 1;

    public get(): string {
        const id = this.id;
        this.id++;
        return id.toString();
    }
}
