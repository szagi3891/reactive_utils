import { observer } from 'mobx-react-lite';
import { Result, Signal } from '@reactive/utils';
import { ComputedAsync } from './ComputedAsync.ts';

type User = { id: number; name: string };
type Post = { id: number; title: string };

const selectedUserId = Signal.create<number>(1);

const user = ComputedAsync.computeAsync(() => {
    const id = selectedUserId.get();

    return async (): Promise<Result<User, string>> => {
        const response = await fetch(`/api/users/${id}`);

        if (!response.ok) {
            return Result.error(`user ${id}: ${response.status}`);
        }

        return Result.ok(await response.json());
    };
});

const posts = ComputedAsync.computeAsync(() => {
    const id = selectedUserId.get();

    return async (): Promise<Result<Post[], string>> => {
        const response = await fetch(`/api/users/${id}/posts`);

        if (!response.ok) {
            return Result.error(`posts ${id}: ${response.status}`);
        }

        return Result.ok(await response.json());
    };
});

const summary = ComputedAsync.from((unbox) => {
    const currentUser = unbox(user);
    const currentPosts = unbox(posts);

    return {
        title: `${currentUser.name} (${currentPosts.length})`,
        headlines: currentPosts.map((post) => post.title),
    };
});

export const UserPage = observer(() => {
    const snapshot = summary.get();

    if (snapshot.status === 'loading') {
        return <p>Ładowanie…</p>;
    }

    if (snapshot.status === 'error') {
        return (
            <p>
                {snapshot.error.message}
                <button type="button" onClick={() => snapshot.error.refresh()}>
                    Ponów
                </button>
            </p>
        );
    }

    const { title, headlines } = snapshot.value;

    return (
        <section>
            <h1>
                {title}
                {snapshot.fetching ? ' …' : ''}
            </h1>
            <button type="button" onClick={() => user.refresh()}>
                Odśwież
            </button>
            <button type="button" onClick={() => selectedUserId.set(2)}>
                User 2
            </button>
            <ul>
                {headlines.map((headline) => (
                    <li key={headline}>{headline}</li>
                ))}
            </ul>
        </section>
    );
});
