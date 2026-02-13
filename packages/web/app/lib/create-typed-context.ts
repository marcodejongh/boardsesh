import { createContext, useContext } from 'react';

/**
 * Creates a typed React context with a null default and a consumer hook
 * that throws if used outside the provider.
 *
 * @param displayName - Used in the error message when the hook is called outside a provider
 * @returns [Context, useHook] tuple
 */
export function createTypedContext<T>(displayName: string): [React.Context<T | null>, () => T] {
  const Context = createContext<T | null>(null);
  Context.displayName = displayName;

  function useTypedContext(): T {
    const value = useContext(Context);
    if (value === null) {
      throw new Error(`use${displayName} must be used within a ${displayName}Provider`);
    }
    return value;
  }

  return [Context, useTypedContext];
}
