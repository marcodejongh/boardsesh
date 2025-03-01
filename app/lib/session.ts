import { getIronSession } from 'iron-session';
import 'server-only';
import { SerializeOptions as CookieSerializeOptions } from 'cookie';
import { BoardName } from './types';

/**
 * {@link https://wicg.github.io/cookie-store/#dictdef-cookielistitem CookieListItem}
 * as specified by W3C.
 */
interface CookieListItem extends Pick<CookieSerializeOptions, "domain" | "path" | "sameSite" | "secure"> {
    /** A string with the name of a cookie. */
    name: string;
    /** A string containing the value of the cookie. */
    value: string;
    /** A number of milliseconds or Date interface containing the expires of the cookie. */
    expires?: CookieSerializeOptions["expires"] | number;
}

/**
 * Superset of {@link CookieListItem} extending it with
 * the `httpOnly`, `maxAge` and `priority` properties.
 */
type ResponseCookie = CookieListItem & Pick<CookieSerializeOptions, "httpOnly" | "maxAge" | "priority">;
/**
 * The high-level type definition of the .get() and .set() methods
 * of { cookies() } from "next/headers"
 */
interface CookieStore {
    get: (name: string) => {
        name: string;
        value: string;
    } | undefined;
    set: {
        (name: string, value: string, cookie?: Partial<ResponseCookie>): void;
        (options: ResponseCookie): void;
    };
}

interface BoardSessionData {
  token: string;
  username: string;
  password: string;
  userId: number;
}

export const getSession = async (cookies: CookieStore, boardName: BoardName) => {
  if (!process.env.IRON_SESSION_PASSWORD) {
    throw new Error("IRON_SESSION_PASSWORD is not set");
  } 
  const password = JSON.parse(process.env.IRON_SESSION_PASSWORD);
  return getIronSession<BoardSessionData>(cookies, {
    password,
    cookieName: `${boardName}_session`,
  });
}