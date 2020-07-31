//
// メイン
//
const Main = new function () {
var mainHtml =
'	<div id="messageContainer">' +
'		<div id="messageBorder">' +
'			<div id="message"></div>' +
'			<div id="messageWait"></div>' +
'		</div>' +
'		<div id="messageChara"><img></div>' +
'		<div id="stand"></div>' +
'	</div>' +
'	<div id="boardContainer">' +
'		<svg id="board" viewBox="0, 0, 830, 830">';
// Androidだと動作が遅くなるため
if (!navigator.userAgent.match(/Android/)) {
mainHtml +=
			// ぼかし
'			<filter id="blur">' +
'				<feGaussianBlur stdDeviation="5"></feGaussianBlur>' +
'				<feBlend mode="overlay"></feBlend>' +
'			</filter>';
}
mainHtml +=
			// 黒石色
'			<linearGradient id="black">' +
'				<stop offset="0%" stop-color="#233"></stop>' +
'				<stop offset="50%" stop-color="#011"></stop>' +
'			</linearGradient>' +
			// 白石色
'			<linearGradient id="white">' +
'				<stop offset="50%" stop-color="#fee"></stop>' +
'				<stop offset="100%" stop-color="#dcc"></stop>' +
'			</linearGradient>' +
'		</svg>' +
		// ダイアログ
'		<div id="dialog">' +
'			<span id="dialogMessage"></span>' +
'			<div id="dialogButton">' +
'			</div>' +
'		</div>' +
'	</div>';

	var promiseList = null;
	var appInstPrompt = undefined;
	var repeat2, repeat3, repeat4;
	var preGameFlag = false;

	this.init = init;

	// 必要な機能の確認と読み込みと作成
	try {
		localStorage.setItem("test", "1");
		localStorage.removeItem("test");

		if (window.IntersectionObserver != null) {
			promiseList = Com.load();
			promiseList.push.apply(Sound.load(["move1", "move2", "message", "button", "win", "even", "loss"]));
		}
	} catch (e) {
	}
	$(function () {
		$(document).on('selectstart contextmenu', function () {
			return false;
		});

		if (promiseList == null) {
			error();
			return;
		}

		// メイン要素追加
		$("#main").prepend(mainHtml);

		// CSS有効監視
		var observer = new IntersectionObserver(function (entry) {
			// 監視要素が表示領域に入ってきたらCSSを無効にしたと見なす
			if (entry[0].isIntersecting) error();
		});
		observer.observe($("#test").get(0));

		// サイズ調整
		$(window).resize(function () {
			var width = 0;
			var height = 0;

			if ($("#messageContainer").css("display") == "flex") {
				// PC以外と見なし、盤面サイズを画面に収まるよう調整
				width = $(window).width();
				height = $(window).height() - $("#boardContainer").offset().top - 1;
			}

			if (width > height) {
				$("#messageContainer").width(height);
				$("#boardContainer").width(height);
			} else {
				// CSSの設定に任せる
				$("#messageContainer").width("");
				$("#boardContainer").width("");
			}
		}).trigger("resize");

		// PWA
		if (navigator.serviceWorker != null) {
			navigator.serviceWorker.register("serwork.js");

			$(window).on("beforeinstallprompt", function (event) {
				if (appInstPrompt === null) return;
				appInstPrompt = event.originalEvent;
				if (preGameFlag) preGame();
			}).on("appinstalled", function () {
				if ($("#appInstBtn").length == 0) return;
				appInstPrompt = null;
				$("#appInstBtn").remove();
				Queue.message("お、ありがとよ。");
			});
		}

		// 読み込み中表示
		var timer = setInterval(function () {
			$("#screen span").text($("#screen span").text() == "◆" ? "■" : "◆");
		}, 500);

		$.when.apply(null, promiseList).then(create, error);

		// 作成
		function create() {
			clearInterval(timer);
			if ($("#messageContainer").length == 0) return;

			// 読み込み後にキャッシュクリア等で画像が読み込めなかった時
			$("#messageChara img").on("error", function () {
				if ($(this).attr("src") != null) error();
			});

			$("#screen span").empty();

			Game.create();
			init(0, 0);
		}

		// エラー
		function error() {
			clearInterval(timer);
			$("#messageContainer").remove();
			$("#boardContainer").remove();
			$("#screen").stop(true, true).show().find("span").html("Error<p><a href='#' style='font-size: 50%;' onclick='location.reload(); return false;'>再読込</p>");
		}
	});

	// 初期化
	//   duration フェードイン時間
	//   delay 開始までの遅延時間
	function init(duration, delay) {
		$("#screen").fadeIn(duration, function () {
			// 盤面クリア
			for (var i = 0; i < 64; i++) Board.setDisc(i, Board.EMPTY);
			Board.setMoveMark(null);

			// コンピューター設定
			Com.setDisc(null);
			Com.setLevel(2);
			Com.setMoveRand();
			Com.setRand0Cnt(0);
			Com.getPlayerTurnMessage();

			$("#message").empty();
			repeat2 = repeat3 = repeat4 = 0;

			if (Com.getYsw() < 3) {
				$("body").removeClass("end");
			} else {
				$("body").addClass("end");
			}

			setTimeout(function () {
				if ($("#messageContainer").length == 0) return;

				// 開始
				$("#screen").fadeOut(100, function () {
					if ($("#messageContainer").length == 0) return;

					if (Com.getYsw() < 3) {
						Queue.message("よう、何の用だ？");
						preGame();
					} else {
						preGameEnd();
					}
				});
			}, delay);
		});
	}

	// 最初のやり取り
	function preGame() {
		preGameFlag = true;
		Queue.dialog({
			button: [
				"お前と勝負したい",
				"お前に用はない",
				Com.getYsw() > 0 ? null : "お前は誰だ？",
				Com.getYsw() == 0 ? null : "調子はどうだ？",
				appInstPrompt == null ? null : {text: "インストールする", attr: {id: "appInstBtn"}}
			],
			callback: function (button) {
				switch (button) {
				case 1:	// お前と勝負したい
					preGameFlag = false;
					Queue.dialog();

					if (Com.getYsw() == 0) {
						Queue.message("なにで、勝負するんだ？");
						Queue.dialog({
							button: ["オセロ", "将棋", "囲碁", "麻雀"],
							callback: function (button) {
								switch (button) {
								case 1:	// オセロ
									Queue.dialog();
									Game.startMessage(null, true);
									break;
								case 2:	// 将棋
								case 3:	// 囲碁
									Queue.message("あえて聞いたんだ。目の前のものをよく見な。");
									break;
								case 4:	// 麻雀
									Queue.message("ヾ(｀◇´)ﾉ彡☆ｺﾉ!ﾊﾞｶﾁﾝｶﾞｧ！目の前のものをよく見て選びな。");
									break;
								}
							}
						});

					} else {
						Game.startMessage(null, true);
					}
					break;

				case 2:	// お前に用はない
					preGameFlag = false;
					Queue.dialog();
					if (repeat2 < 1) {
						Queue.message("なんだ、対人戦をするのか？");
						Queue.dialog({
							button: ["そうだ", "いいや"],
							callback: function (button) {
								Queue.dialog();

								switch (button) {
								case 1:	// そうだ
									Queue.message("悪いが対人戦は他でやってくれ。<br />他に何か用か？");
									break;
								case 2:	// いいや
									Queue.message("なんじゃそりゃ、はっきりしろ！<br />何の用だ？");
									break;
								}

								preGame();
							}
						});
						repeat2++;
					} else {
						Game.startMessage("だが付き合ってもらうぜ。<br />", true);
					}
					break;

				case 3:	// お前は誰だ？
					var msg = [
						"俺はお前の対戦相手だ。俺が相手をしてやる。",
						"俺の事より、早く始めようぜ。そのためにここに来たんだろ？",
						"そう言うお前は強いのか？ まぁ、俺より弱ければ誰でもいいけどな。",
						"ここでいつまでも話し合うより、とっとと始めるぜよ。",
						"それはもういいだろ？ 早く始めるぞ。",
						"…始めるぞ。"
					];
					if (repeat3 < msg.length) {
						Queue.message(msg[repeat3++]);
					} else {
						Queue.dialog();
						Game.startMessage("もういい。<br />", true);
					}
					break;

				case 4:	// 調子はどうだ？
					if (repeat4 < 3) {
						var moveRand = Com.getMoveRand();
						if (moveRand < 300) {
							Queue.message("好調だぜよ。");
						} else if (moveRand < 400) {
							Queue.message("普通だ。<br />他に？");
						} else if (moveRand < 500) {
							Queue.message("いまいち。");
						} else {
							Queue.message("ちょっと調子悪いんだ。<br />他に？");
						}
						repeat4++;
					} else {
						Queue.message("しつけーよ、お前。もう言わん！");
					}
					break;

				case 5:	// インストールする
					appInstPrompt.prompt();
					break;
				}
			}
		});
	}

	// 最初のやり取り
	function preGameEnd() {
		Queue.dialog({
			message: "何をしますか？",
			button: ["対人戦", "完全リセット"],
			callback: function (button) {
				Queue.dialog();

				switch (button) {
				case 1:	// 対人戦
					Game.startMessage(null, true);
					break;
				case 2:	// 完全リセット
					Queue.dialog({
						message: "完全リセットしますか？",
						button: ["はい", "いいえ"],
						callback: function (button) {
							Queue.dialog();

							switch (button) {
							case 1:	// はい
								Com.setYsw(0);
								init(1500, 1000);
								break;
							case 2:	// いいえ
								preGameEnd();
								break;
							}
						}
					});
					break;
				}
			}
		});
	}
}();
