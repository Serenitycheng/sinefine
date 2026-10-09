import { FateRouteProvider } from '@/components/fate-route-provider';

export default function FateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FateRouteProvider>{children}</FateRouteProvider>;
}
