self.addEventListener("install", (event) => {
  console.log("Service Worker Installed");
  self.skipWaiting(); // Ensure it activates immediately
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker Activated");
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked", event.notification);
});
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            client.url === event.notification.data?.url &&
            "focus" in client
          ) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data?.url || "/");
        }
      })
  );
});
