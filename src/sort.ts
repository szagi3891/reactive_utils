
export const sort = <T, K extends Array<[
    'asc' | 'desc', 
    ((item: T) => string) | ((item: T) => number)
]>,>(list: Array<T>, sortBy: K): Array<T> => {

    return list.toSorted((item1: T, item2: T) => {

        for (const [sortOrder, sort] of sortBy) {
            const value1 = sort(item1);
            const value2 = sort(item2);

            if (sortOrder === 'asc') {
                if (value1 > value2) {
                    return 1;
                }

                if (value1 < value2) {
                    return -1;
                }
            } else {
                if (value1 > value2) {
                    return -1;
                }

                if (value1 < value2) {
                    return 1;
                }
            }
        }

        return 0;
    });
};
