import { FateProvider } from '@/components/fate-provider';

export default function FateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FateProvider>{children}</FateProvider>;
}
