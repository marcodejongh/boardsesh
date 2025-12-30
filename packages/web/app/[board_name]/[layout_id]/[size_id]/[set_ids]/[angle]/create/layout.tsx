import { CreateClimbProvider } from '@/app/components/create-climb/create-climb-context';

export default function CreateClimbLayout({ children }: { children: React.ReactNode }) {
  return <CreateClimbProvider>{children}</CreateClimbProvider>;
}
