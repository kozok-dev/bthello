//
// 定期実行
//
const Tick = new function () {
	// 定期実行のメタ情報
	const metaList = {};

	this.interval = interval;
	this.once = once;
	this.cycle = cycle;
	this.getMetaValue = function (metaId) {
		return metaList[metaId] == null ? null : metaList[metaId].value;
	};
	this.stop = stop;
	this.stopAll = function (metaIdRegExp) {
		var regExp = RegExp(metaIdRegExp);
		for (var metaId in metaList) {
			if (regExp.test(metaId)) stop(metaId);
		}
	};

	// コールバック関数がtrueを返す限り、定期実行する。初回は同期実行
	//   metaId メタ情報識別ID
	//   callback(t) コールバック関数。tはtimeを1としたものでジャストタイミングで実行されたなら1になる。初回は必ず1
	//   time 実行間隔時間
	//   rafFlag setTimeoutの代わりにrequestAnimationFrameを使用する場合にtrueを指定する
	function interval(metaId, callback, time, rafFlag) {
		if (metaList[metaId] == null) {
			//--- 指定したmetaIdでこの関数を実行したことがない
			// メタ情報を初期化する
			metaList[metaId] = {
				dispValue: {},	// 未使用
				value: {},	// 未使用
				timer: null
			};

		} else {
			//--- 指定したmetaIdでこの関数を実行したことがある
			stop(metaId);	// 定期実行中を考慮して停止する
		}

		var startTime = null;
		step();
		function step() {
			var intervalTime = performance.now();
			var t = (startTime == null ? 1 : (intervalTime - startTime) / time);
			startTime = intervalTime;

			if (!callback(t)) return;

			if (rafFlag) {
				metaList[metaId].raf = requestAnimationFrame(step);
			} else {
				metaList[metaId].timer = setTimeout(step, time);
			}
		}
	}

	// 指定した期間の間、定期実行する。既に同じ値になっている場合は実行せずfalseを返す。delay未指定時の初回は同期実行
	// ※初回実行でmetaListのvalueは設定されるので、この関数の実行直後にgetMetaValueを呼び出すと設定後の値となる
	//   metaId メタ情報識別ID
	//   after 設定する値(object形式)
	//   callback(value, t) コールバック関数。valueは定期実行毎に常時変化する値。tは定期実行時間を0～1としたもの。falseを返すと定期実行を中止する
	//   duration 定期実行期間
	//   delay 定期実行開始時間
	function once(metaId, after, callback, duration, delay) {
		var dispValue;

		if (metaList[metaId] == null) {
			//--- 指定したmetaIdでこの関数を実行したことがない

			// 定期実行前の値を初期化する
			dispValue = {};
			for (var i in after) dispValue[i] = 0;

			// 設定する値がnullの場合は定期実行前の値と同じにする
			for (var i in dispValue) {
				if (after[i] == null) after[i] = dispValue[i];
			}

			// メタ情報を初期化する
			metaList[metaId] = {
				dispValue: dispValue,
				value: after,
				timer: null
			};

		} else {
			//--- 指定したmetaIdでこの関数を実行したことがある

			// 定期実行前の値を保持しておく
			dispValue = metaList[metaId].dispValue;

			// 定期実行前の値が設定する値に存在しない場合は初期化する
			for (var i in after) {
				if (dispValue[i] == null) dispValue[i] = 0;
			}

			// 設定する値がnullの場合は定期実行前の値と同じにする
			for (var i in dispValue) {
				if (after[i] == null) after[i] = dispValue[i];
			}

			metaList[metaId].value = after;
			stop(metaId);	// 定期実行中を考慮して停止する
		}

		// 更新前後の差分を確認する
		var diffFlag = false;
		for (var i in dispValue) {
			if (after[i] == dispValue[i]) continue;
			diffFlag = true;
			break;
		}
		if (!diffFlag) return false;	// 更新前と差がないので何もしない

		var startTime = null;

		// 定期実行
		if (delay == null) {
			step();
		} else {
			metaList[metaId].timer = setTimeout(step, delay);
		}
		return true;

		function step() {
			// 経過時間
			var time;
			if (startTime == null) {
				time = 0;
				startTime = performance.now();
			} else {
				time = performance.now() - startTime;
				if (time < 0 || time > duration) time = duration;
			}
			var t = time / duration;

			var value = {};
			for (var i in dispValue) {
				value[i] = dispValue[i] + (after[i] - dispValue[i]) * $.easing["swing"](t);
			}

			// 表示用の値を更新。念のため、定期実行が終わったら実際の値にする
			metaList[metaId].dispValue = (t < 1 ? value : after);

			if (callback(value, t) === false) return;

			if (t < 1) metaList[metaId].raf = requestAnimationFrame(step);
		}
	}

	// 指定した時間の間、定期実行を繰り返す。初回は同期実行
	//   metaId ※onceと同様
	//   after ※onceと同様
	//   callback(value, t, cnt) cntは定期実行毎に+1される。※他はonceと同様
	//   duration ※onceと同様
	//   cnt 定期実行回数(内部で使用)
	function cycle(metaId, after, callback, duration, cnt) {
		var before;
		if (cnt == null) cnt = 0;

		if (cnt == 0 && metaList[metaId] != null) {
			// 更新前と差がないと定期実行しないので、常に差があるするようにする
			var dispValue = metaList[metaId].dispValue;
			for (var i in dispValue) {
				dispValue[i] = 0;
			}
		}

		once(metaId, after, function (value, t) {
			if (t < 1) {
				if (t == 0) before = metaList[metaId].dispValue;
				if (callback(value, t, cnt) === false) return false;
			} else {
				once(metaId, before, function (value, t) {
					if (t < 1) {
						if (callback(value, t, cnt + 1) === false) return false;
					} else {
						cycle(metaId, after, callback, duration, cnt + 2);
					}
				}, duration);
			}
		}, duration);
	}

	// 定期実行を停止する
	//   metaId メタ情報識別ID
	function stop(metaId) {
		if (metaList[metaId] == null) return;

		if (metaList[metaId].timer != null) {
			clearTimeout(metaList[metaId].timer);
			metaList[metaId].timer = null;
		}

		if (metaList[metaId].raf != null) {
			cancelAnimationFrame(metaList[metaId].raf);
			metaList[metaId].raf = null;
		}
	}
}();
