export function EnvProvider() {
  return (
    <script
      id="environment-variables"
      dangerouslySetInnerHTML={{
        __html: `window.env = {
          NEXT_PUBLIC_OPEN_AI_KEY: "${process.env.NEXT_PUBLIC_OPEN_AI_KEY}"
        };`,
      }}
    />
  );
}
