const cacheName="v1",fileList=["index.html","main.css","manifest.json","icon.png","jquery.js","tick.js","board.js","sound.js","rule.js","queue.js","game.js","com.js","comwork.js","main.js","book.png","eval.png","normal.gif","better.gif","best.gif","worse.gif","worst.gif","win4.gif","win10.gif","win20.gif","win30.gif","win40.gif","win50.gif","win64.gif","loss.gif","loss4.gif","loss10.gif","loss20.gif","loss30.gif","loss40.gif","loss50.gif","loss64.gif","move1.mp3","move2.mp3","message.mp3","button.mp3","win.mp3","even.mp3","loss.mp3"];oninstall=function(i){i.waitUntil(caches.open("v1").then(function(i){return i.addAll(fileList)})),skipWaiting()},onactivate=function(i){i.waitUntil(caches.keys().then(function(i){return Promise.all(i.map(function(i){if("v1"!=i)return caches.delete(i)}))})),clients.claim()},onfetch=function(i){i.respondWith(caches.open("v1").then(function(n){return n.match(i.request).then(function(n){return n||fetch(i.request)})}))};