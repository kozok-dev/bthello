//
// キュー
//
const Queue = new function () {
	// キュー
	const queue = [];

	// message実行回数(message関数用)
	var msgCnt = 0;

	// dialogのbuttonイベント受け付けフラグ(dialog関数用)
	var eventDialogFlag = false;

	// タイマーID(interval関数用)
	var intervalTimer = null;

	// キャラの吹き出しにテキスト表示
	//   msg テキスト
	this.message = function (msg) {
		if ($("#messageChara img").attr("src") == null) return;

		if (queue.length >= 1 && queue[0].type== "message" && msgCnt > 1) {
			// messageの設定直後でないアニメーション中の場合は、そのアニメーションを止めて次のキューへ
			Tick.stop("message");
			nextQueue();
		}

		queue.push({
			type: "message",
			msg: msg
		});
		if (queue.length == 1) nextQueue(true);
	};

	// ダイアログ
	//   option オプション。詳細は該当関数参照
	this.dialog = function (option) {
		queue.push({
			type: "dialog",
			option: option
		});
		if (queue.length == 1) nextQueue(true);
	};

	// インターバル
	//   duration 時間
	this.interval = function (duration) {
		queue.push({
			type: "interval",
			duration: duration
		});
		if (queue.length == 1) nextQueue(true);
	};

	// 押下イベント待ち
	this.wait = function () {
		queue.push({
			type: "wait"
		});
		if (queue.length == 1) nextQueue(true);
	};

	// コールバック関数
	//   func 呼び出すコールバック関数
	this.callback = function (func) {
		queue.push({
			type: "callback",
			func: func
		});
		if (queue.length == 1) nextQueue(true);
	};

	// 全てのキューをクリアする
	//   noStopFlag アニメーションは止めない場合にtrueを指定する
	this.clear = function (noStopFlag) {
		if (!noStopFlag) stop();
		queue.splice(0, queue.length);
	};

	// 次のキューを実行する
	//   noShiftFlag 現在のキューを削除しない場合にtrueを指定する
	function nextQueue(noShiftFlag) {
		if (!noShiftFlag && queue.length > 0) queue.shift();
		if (queue.length == 0) return;

		switch (queue[0].type) {
		case "message":
			message(queue[0].msg);
			break;
		case "dialog":
			dialog(queue[0].option);
			break;
		case "interval":
			clearTimeout(intervalTimer);
			intervalTimer = setTimeout(function () {
				nextQueue();
			}, queue[0].duration);
			break;
		case "wait":
			wait();
			break;
		case "callback":
			callback(queue[0].func);
			break;
		default:
			// 通常あり得ないが、対応していないタイプの場合は即座に次のキューへ
			nextQueue();
			break;
		}
	}

	// 処理中のキューを停止する
	function stop() {
		if (queue.length == 0) return;

		switch (queue[0].type) {
		case "message":
			Tick.stop("message");
			break;
		case "dialog":
			// 対応しない
			break;
		case "interval":
			clearTimeout(intervalTimer);
			break;
		case "wait":
			$(document).off("click.wait");
			break;
		case "callback":
			// 対応しない
			break;
		}
	}

	// キャラクターの吹き出しにHTMLタグ可能なテキストを表示する
	//   msg テキスト
	function message(msg) {
		var strCnt = 0;
		msgCnt = 0;
		Sound.play("message");

		Tick.interval("message", function (t) {
			strCnt += Math.round(t);
			msgCnt++;

			var str = msg.substring(0, strCnt);

			// タグ文字がある場合、タグ文字の次の通常文字まで進める
			var pos = 0;
			var tagStack = [];
			for (;;) {
				var tmp = str.indexOf("<", pos);
				if (tmp == -1) break;
				pos = tmp + 1;	// "<"の1文字分進める

				// タグの終わり位置(表示するテキストだとタグが途中で切れている可能性を考慮し、最終的に表示するテキストから取得する)
				tmp = msg.indexOf(">", pos);
				if (tmp == -1) break;	// タグが不正だった

				// タグ名
				var match = msg.substring(pos, tmp).match(/^(\/?)(\w+)/i);
				pos = tmp + 1;	// ">"の1文字分進める
				if (match == null) continue;	// タグが不正だった

				if (match[1] == '/') {
					// 閉じタグだった
					if (tagStack.length > 0 && tagStack[tagStack.length - 1] == match[2].toLowerCase()) {
						// 対となる正しい閉じタグだったので、そのタグをスタックからポップする
						tagStack.pop();
					}
				} else {
					if (msg.substring(tmp - 1, tmp) != "/") {
						// "<br />"等ではなく、"<b>"等の閉じタグが必要となるタグだった場合、そのタグをスタックにプッシュする
						tagStack.push(match[2].toLowerCase());
					}
				}

				// 表示しようとしていたテキストの文字数より多くなった場合は表示テキストを更新する
				if (strCnt < pos + 1) {
					strCnt = pos + 1;
					str = msg.substring(0, strCnt);
				}
			}

			// スタックに溜まっているタグを全てポップしながら閉じタグを追記する
			for (;;) {
				var tag = tagStack.pop();
				if (tag == null) break;
				str += "</" + tag + ">";
			}

			$("#message").html(str);

			if (strCnt < msg.length) return true;

			// アニメーションが終了したので実行カウントをクリアして次のキューへ
			strCnt = msgCnt = 0;
			nextQueue();
			return false;
		}, 10, true);
	}

	// ダイアログを表示する
	//   option オプション。null指定でダイアログを非表示にする
	//          message ダイアログに表示するメッセージ
	//          button ダイアログに表示する文字列または、{text: ..., attr: {...}}形式のボタン配列
	//          callback(button) ボタン押下で呼ばれる関数。buttonは1始まり
	//                           ダイアログ押下で閉じた、または自動で閉じた場合はbuttonが0で呼ばれる
	//          closeable ボタン以外押下で閉じれるようにする場合はtrueを指定する
	//          autoCloseTime 自動で閉じる時間を指定する。nullで自動で閉じない
	function dialog(option) {
		var $dialog = $("#dialog");

		eventDialogFlag = false;

		if (option != null) {
			var $dialogMessage = $("#dialogMessage");
			var $dialogButton = $("#dialogButton");

			var timer = null;

			// メッセージ設定
			if (option.message != null) {
				$dialogMessage.show().html(option.message);
			} else {
				$dialogMessage.hide().empty();
			}

			// ボタン設定
			if (option.button != null) {
				$dialogButton.show().empty();
				for (var i = 0; i < option.button.length; i++) {
					if (option.button[i] == null) continue;

					var $button = $("<button>");
					if (typeof(option.button[i]) == "string") {
						$button.html(option.button[i]);
					} else {
						$button.html(option.button[i].text).attr(option.button[i].attr);
					}

					$button.click(function (button) {
						return function (event) {
							if (!eventDialogFlag) return;
							event.stopPropagation();
							eventDialogFlag = false;
							clearTimeout(timer);	// 自動でダイアログが閉じるのを止める

							// ボタン押下アニメーション後、コールバック関数を実行
							var $button = $(this);
							$button.parent().find("button").addClass("disable");
							$button.addClass("active");
							var self = this;
							Sound.play("button");
							Tick.cycle("button", {scale: 0.1}, function (value, t, cnt) {
								if (cnt < 2) {
									$button.css("transform", "scale(" + (1 - value.scale) + ", " + (1 - value.scale) + ")");
								} else {
									eventDialogFlag = true;
									$button.css("transform", "").parent().find("button").removeClass("disable").removeClass("active");
									if (option.callback != null) option.callback.call(self, button);
									return false;
								}
							}, 50);
						};
					}(i + 1)).appendTo($dialogButton);
				}
			} else {
				$dialogButton.hide().empty();
			}

			// ボタン以外押下で閉じる設定
			if (option.closeable) {
				$(document).on("click.dialog", function () {
					if (!eventDialogFlag) return;
					clearTimeout(timer);
					dialog(null);
					if (option.callback != null) option.callback.call(this, 0);
				});
			} else {
				$(document).off("click.dialog");
			}

			// 自動でダイアログを閉じる設定
			if (option.autoCloseTime != null) {
				timer = setTimeout(function () {
					dialog(null);
					if (option.callback != null) option.callback.call(this, 0);
				}, option.autoCloseTime);
			}
		} else {
			// ダイアログを非表示にするので、ボタン以外押下を無効にする
			$(document).off("click.dialog");
		}

		var tickFlag = Tick.once("dialog", {scale: option == null ? 0 : 1}, function (value, t) {
			if (value.scale == 1) {
				$dialog.show().css("transform", "translate(-50%, -50%)");
			} else if (value.scale > 0) {
				$dialog.show().css("transform", "translate(-50%, -50%) scale(" + value.scale + ", " + value.scale + ")");
			} else {
				$dialog.hide().css("transform", "");
			}

			if (t >= 1) {
				// アニメーションが終了して、かつ、ダイアログが表示されないと押下等のイベントを受け付けないようにする
				if (option != null) eventDialogFlag = true;

				nextQueue();	// アニメーションが終了したので次のキューへ
			}
		}, 100);

		if (!tickFlag) {
			if (option != null) eventDialogFlag = true;
			nextQueue();	// アニメーション不要なので次のキューへ
		}
	}

	// 押下イベント待ちとそれを示す表示を行う
	function wait() {
		var $messageWait = $("#messageWait");
		$messageWait.show();

		Tick.cycle("wait", {scale: 1}, function (value, t, cnt) {
			$messageWait.css("transform", "translate(0, " + (value.scale * 3) + "px) scale(1, " + (1 - value.scale * 0.5) + ")");
		}, 400);

		$(document).off("click.wait").on("click.wait", function () {
			$(this).off("click.wait");
			Tick.stop("wait");
			$messageWait.hide().css("transform", "");

			nextQueue();	// 押下イベントが完了したので次のキューへ
		});
	}

	// コールバック関数
	//   func 呼び出すコールバック関数。objectを返すとPromiseと見なす
	function callback(func) {
		var defer = func();

		if (typeof(defer) == "object") {
			defer.promise().then(function () {
				nextQueue();
			});
		} else {
			nextQueue();
		}
	}
}();
