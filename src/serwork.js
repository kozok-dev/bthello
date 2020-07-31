//
// オフライン制御Service Worker
//
const cacheName = "v1";
const fileList = [
	"index.html", "main.css", "manifest.json", "icon.png",
	"jquery.js", "tick.js", "board.js", "sound.js", "rule.js", "queue.js", "game.js", "com.js", "comwork.js", "main.js",
	"book.png", "eval.png",
	"normal.gif", "better.gif", "best.gif", "worse.gif", "worst.gif",
	"win4.gif", "win10.gif", "win20.gif", "win30.gif", "win40.gif", "win50.gif", "win64.gif",
	"loss.gif", "loss4.gif", "loss10.gif", "loss20.gif", "loss30.gif", "loss40.gif", "loss50.gif", "loss64.gif",
	"move1.mp3", "move2.mp3", "message.mp3", "button.mp3", "win.mp3", "even.mp3", "loss.mp3"
];

oninstall = function (event) {
	event.waitUntil(caches.open(cacheName).then(function (cache) {
		return cache.addAll(fileList);
	}));
	skipWaiting();
};

onactivate = function (event) {
	event.waitUntil(caches.keys().then(function (keyList) {
		return Promise.all(keyList.map(function (key) {
			if (key != cacheName) return caches.delete(key);
		}));
	}));
	clients.claim();
};

onfetch = function (event) {
	event.respondWith(caches.open(cacheName).then(function (cache) {
		return cache.match(event.request).then(function (response) {
			return response || fetch(event.request);
		});
	}));
};
