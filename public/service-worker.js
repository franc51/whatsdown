let currentNotification = null; // Variable to store the current notification

self.addEventListener("install", (event) => {
  console.log("Service Worker Installed");
  self.skipWaiting(); // Ensure the service worker activates immediately
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker Activated");
  // Claim clients to ensure the service worker controls all open windows/tabs
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("Push notification received", event);

  const data = event.data ? event.data.json() : {}; // Parse the push event data

  const options = {
    body: data.body || "You have a new message", // Default message if none provided
    icon: data.icon || "/default-icon.png", // Default icon if none provided
    badge: data.badge || "/default-badge.png", // Default badge if none provided
    data: data.url || "/", // URL to navigate to when the notification is clicked
  };

  // Check if we already have a notification
  if (currentNotification) {
    // If we have an existing notification, update its body
    currentNotification.body += `\n${data.body}`; // Append the new message to the existing body
    currentNotification.close(); // Close the previous notification
    // Recreate the notification with updated body
    event.waitUntil(
      self.registration.showNotification(data.title || "New message", {
        ...options,
        body: currentNotification.body,
      })
    );
  } else {
    // If no existing notification, show a new one
    event.waitUntil(
      self.registration.showNotification(data.title || "New message", options)
    );
  }

  // Store the current notification object (just for tracking purposes)
  currentNotification = {
    ...options,
    body: options.body,
  };
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked", event.notification);

  // Close the notification
  event.notification.close();

  // Handle opening the URL from the notification data
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if any of the existing windows has the same URL as the notification
        for (const client of clientList) {
          if (
            client.url === event.notification.data?.url &&
            "focus" in client
          ) {
            return client.focus();
          }
        }
        // If no matching window, open a new one with the notification URL
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data?.url || "/");
        }
      })
  );
});
