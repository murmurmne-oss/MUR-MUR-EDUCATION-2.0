export default function Head() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta
        name="viewport"
        content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
      />
      {/* Telegram WebApp SDK must live in <head> so window.Telegram is ready ASAP */}
      <script
        data-telegram-sdk="true"
        src="https://telegram.org/js/telegram-web-app.js"
      />
    </>
  );
}

