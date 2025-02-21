import type { AppProps } from 'next/app';
import { EnvProvider } from '@/components/EnvProvider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <EnvProvider />
      <Component {...pageProps} />
    </>
  );
}
