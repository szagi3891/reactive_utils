export class AutoId { 
    private id: number = 1;

    public get(): number {
        const id = this.id;
        this.id++;
        return id;
    }
}
