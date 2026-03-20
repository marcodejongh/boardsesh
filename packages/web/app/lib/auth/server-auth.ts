import 'server-only';
import { cookies } from 'next/headers';

export async function getServerAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return (
    cookieStore.get('__Secure-next-auth.session-token')?.value ??
    cookieStore.get('next-auth.session-token')?.value
  );
}
