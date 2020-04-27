// Event that shows a notification when is received by push
/**
 * Code below is a modified version of Google's example on how to set up the web push notifications to display a notification
 * URL: https://developers.google.com/web/fundamentals/push-notifications/handling-messages
 * Accessed: 25/04/2020
 * Author: Google
 */
self.addEventListener('push', event => {
		const data = event.data.json(); // parse the data as json
		self.registration.showNotification(data.title, {
			body: data.body,
			icon: ""
		});
});