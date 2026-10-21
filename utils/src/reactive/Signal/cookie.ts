export type CookieOptions = {
    /** Default `/`, so every page of the site sees the cookie. */
    path?: string;
    /** Default one year. */
    maxAgeSeconds?: number;
    /** Default `Lax`. */
    sameSite?: 'Lax' | 'Strict' | 'None';
    secure?: boolean;
    domain?: string;
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// RFC 6265 token: what may stand as a cookie name without escaping.
const COOKIE_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

export const isCookieNameValid = (name: string): boolean => COOKIE_NAME_PATTERN.test(name);

export const hasDocument = (): boolean => typeof document !== 'undefined';

/** The still encoded value of the cookie, or null when there is none. */
export const readCookieRaw = (name: string): string | null => {
    for (const part of document.cookie.split(';')) {
        const separator = part.indexOf('=');
        if (separator !== -1 && part.slice(0, separator).trim() === name) {
            return part.slice(separator + 1).trim();
        }
    }

    return null;
};

export const writeCookieRaw = (name: string, raw: string, options: CookieOptions | undefined): void => {
    const parts = [
        `${name}=${raw}`,
        `Path=${options?.path ?? '/'}`,
        `Max-Age=${options?.maxAgeSeconds ?? ONE_YEAR_SECONDS}`,
        `SameSite=${options?.sameSite ?? 'Lax'}`,
    ];
    if (options?.domain !== undefined) {
        parts.push(`Domain=${options.domain}`);
    }
    if (options?.secure === true || options?.sameSite === 'None') {
        parts.push('Secure');
    }

    document.cookie = parts.join('; ');
};
