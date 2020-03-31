//Event that shows a notification when is received by push
self.addEventListener('push', event => {
		const data = event.data.json();
		self.registration.showNotification(data.title, {
			body: data.body,
			icon: ""
		});
});

//Event on notification click (have problems almost in Chrome)
self.addEventListener('notificationclick', () => {
		console.log('Notificación pulsada!');
});