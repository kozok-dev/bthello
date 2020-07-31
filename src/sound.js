//
// 音声
//
const Sound = new function () {
	const context = (window.AudioContext != null || window.webkitAudioContext != null ? new (window.AudioContext || window.webkitAudioContext)() : null);
	const soundList = [];

	this.load = load;
	this.play = play;

	// 読み込み
	//   fileList 名称配列
	function load(fileList) {
		if (context == null) {
			var defer = $.Deferred();
			defer.reject();
			return [defer.promise()];
		}

		var promiseList = [];

		for (var i in fileList) {
			(function (file, defer) {
				var xhr = new XMLHttpRequest();
				xhr.open("GET", fileList[i] + ".mp3");
				xhr.responseType = "arraybuffer";

				xhr.onload = function () {
					if (xhr.status == 200) {
						context.decodeAudioData(xhr.response, function (buffer) {
							soundList[file] = {buffer: buffer, source: null};
							defer.resolve();
						}, function () {
							defer.reject();
						});
					} else {
						defer.reject();
					}
				};

				xhr.onerror = function () {
					defer.reject();
				};

				xhr.send();

				promiseList.push(defer.promise());
			})(fileList[i], $.Deferred());
		}

		return promiseList;
	}

	// 再生
	//   file 名称
	function play(file) {
		if (soundList[file] == null) return;

		if (context.state == "suspended") {
			// iPhone等ではしばらく放置すると勝手にsuspended状態になるので復帰させる
			context.resume().then(exec);
		} else {
			exec();
		}

		function exec() {
			if (soundList[file].source != null) soundList[file].source.stop();

			soundList[file].source = context.createBufferSource();
			soundList[file].source.buffer = soundList[file].buffer;
			soundList[file].source.connect(context.destination);
			soundList[file].source.start();
		}
	}
}();
