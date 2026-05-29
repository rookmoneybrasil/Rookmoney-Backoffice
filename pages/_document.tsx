import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        <meta name="theme-color" content="#080E1D" />
      </Head>
      <body className="bg-ink-900 text-slate-100 antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
