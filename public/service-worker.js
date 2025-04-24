self.addEventListener("install", (event) => {
  console.log("✅ Service worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("🎉 Service worker activated");
});

// Allow showing notifications when app is running
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow("/");
    })
  );
});
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data?.url || "/");
    })
  );
});
