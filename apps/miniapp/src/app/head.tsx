export default function Head() {
  return (
    <>
      <script src="https://telegram.org/js/telegram-web-app.js"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function () {
              console.log('[head.tsx] window.Telegram:', window.Telegram);
            });
          `,
        }}
      ></script>
    </>
  );
}

