//
// コンピューター
//
const Com = new function () {
	var disc;	// コンピューターの石の色
	var depthMid, depthExact, depthWld;
	var level;	// コンピューターのレベル
	var moveRand;	// コンピューターの打つ手の変化度合い

	const comwork = (window.Worker != null ? new Worker("comwork.js") : null);

	const charaImg = {};
	var status = NaN, posRand = 0, ysw = 0, rand0Cnt = 0;

	this.load = load;

	this.getDisc = function () {
		return disc;
	};
	this.setDisc = function (_disc) {
		disc = _disc;
	};
	this.getLevel = function () {
		return level;
	};
	this.setLevel = setLevel;
	this.getMoveRand = function () {
		return moveRand;
	};
	this.setMoveRand = setMoveRand;

	this.move = move;

	this.getPlayerTurnMessage = getPlayerTurnMessage;
	this.getPassMessage = getPassMessage;
	this.getCantFlipMessage = getCantFlipMessage;
	this.getUndoMessage = getUndoMessage;
	this.getThinkingMessage = getThinkingMessage;
	this.getEndMessage = getEndMessage;
	this.getExitMessage = getExitMessage;
	this.getPosRand = function () {
		return posRand;
	};
	this.getYsw = function () {
		return ysw;
	};
	this.setYsw = function (_ysw) {
		ysw = _ysw;
		if (ysw > 0) {
			localStorage.setItem("ysw", ysw > 1 ? ysw : "これを消すと俺の記憶がぶっ飛んじまうぜよ！");
		} else {
			ysw = 0;
			localStorage.removeItem("ysw");
		}
	};
	this.getRand0Cnt = function () {
		return rand0Cnt;
	};
	this.setRand0Cnt = function (_rand0Cnt) {
		rand0Cnt = _rand0Cnt;
	};

	// 各種読み込み
	function load() {
		if (comwork == null) {
			var defer = $.Deferred();
			defer.reject();
			return [defer.promise()];
		}

		var promiseList = [];

		// 画像化された思考データ読み込み
		(function (defer) {
			const imgName = ["book.png", "eval.png"];
			var img = [], imgData = [];
			var loadCnt = 0;

			for (var i in imgName) {
				img[i] = new Image();
				img[i].onload = function () {
					loadCnt++;
					try {
						create();
					} catch (e) {
						defer.reject();
					}
				};
				img[i].onerror = function () {
					defer.reject();
				};
				img[i].src = imgName[i];
			}

			function create() {
				if (loadCnt < imgName.length) return;

				// 画像のピクセルデータ取得
				var canvas = document.createElement("canvas");
				var context = canvas.getContext("2d");
				for (var i in img) {
					canvas.width = img[i].width;
					canvas.height = img[i].height;
					context.drawImage(img[i], 0, 0);
					imgData[i] = context.getImageData(0, 0, canvas.width, canvas.height).data;
				}

				comwork.onmessage = function (event) {
					if (event.data) {
						defer.resolve();
					} else {
						defer.reject();
					}
				};

				// 画像のピクセルデータから思考データ作成指示
				comwork.postMessage({
					bookImgData: imgData[0],
					evalImgData: imgData[1]
				}, [imgData[0].buffer, imgData[1].buffer]);
			}

			promiseList.push(defer.promise());
		})($.Deferred());

		// キャラ画像読み込み
		const charaImgName = [
			"normal", "better", "best", "worse", "worst", "loss",
			"win4", "win10", "win20", "win30", "win40", "win50", "win64",
			"loss4", "loss10", "loss20", "loss30", "loss40", "loss50", "loss64"
		];
		for (var i in charaImgName) {
			(function (defer) {
				var img = new Image();
				img.onload = function () {
					defer.resolve();
				};
				img.onerror = function () {
					defer.reject();
				};
				img.src = charaImgName[i] + ".gif";
				charaImg[charaImgName[i]] = img;

				promiseList.push(defer.promise());
			})($.Deferred());
		}

		ysw = localStorage.getItem("ysw");
		if (ysw == null) {
			ysw = 0;
		} else {
			ysw = parseInt(ysw);
			if (isNaN(ysw) || ysw < 1) ysw = 1;
		}

		return promiseList;
	}

	// レベル設定
	//   _level レベル
	function setLevel(_level) {
		level = _level;
		switch (level) {
		case 1:
			depthMid = 1;
			depthExact = 4;
			depthWld = 6;
			break;
		case 2:
			depthMid = 2;
			depthExact = 6;
			depthWld = 8;
			break;
		case 3:
			depthMid = 4;
			depthExact = 10;
			depthWld = 12;
			break;
		default:
			depthMid = 6;
			depthExact = 14;
			depthWld = 16;
			break;
		}
	};

	// 調子設定
	function setMoveRand() {
		moveRand = Math.floor(Math.random() * 400) + 200 & ~1;	// 200～599の偶数
	};

	// 打つ手を思考する
	//   callback(response) 思考後に呼ばれるコールバック関数
	function move(callback) {
		// 都合上、Boardとは異なる値に設定
		const BLACK = 0;
		const WHITE = 1;
		const EMPTY = 2;
		const WALL = 3;

		var board = [];

		// 局面をcomwork用に変換する(Rule.toC参照)
		for (var i = 0; i < 10; i++) board[i] = board[i + 81] = board[i * 9] = WALL;
		for (var i = 0; i < 64; i++) {
			var boardDisc;
			switch (Board.getDisc(i)) {
			case Board.BLACK:
				boardDisc = BLACK;
				break;
			case Board.WHITE:
				boardDisc = WHITE;
				break;
			default:
				boardDisc = EMPTY;
				break;
			}
			board[Rule.toC(i)] = boardDisc;
		}

		// 結果を受信
		comwork.onmessage = function (event) {
			event.data.move = Rule.toP(event.data.move);
			callback(event.data);
		};

		// 打つ手を思考するよう指示
		var rand;
		if (rand0Cnt > 0) {
			rand = 0;
		} else if (rand0Cnt < 0) {
			rand = 800;
		} else {
			rand = moveRand;
		}
		comwork.postMessage({
			board: board,
			disc: Rule.getTurn().disc == Board.BLACK ? BLACK : WHITE,
			depthMid: depthMid,
			depthExact: depthExact,
			depthWld: depthWld,
			moveRand: Math.floor(level == 1 ? rand * 1.5 : (level == 2 ? rand : (level == 3 ? rand / 2 : 0)))
		});
	}

	// 性能テスト
	/*function test() {
		const recordList = [
			"f5d6c3d3c4f4c5b3c2b4e3e6c6f6a5a4b5a6d7c7e7c8e8b6f7d1g3g4c1f2e2f1e1b1d2g1f3h4h5h6a3g5h3f8h7a2",
			"d3c3c4c5e6e3c6d6b4b3b6a4d7f4f3f5f6g5e2g6b5c7d8c2d2a5a6a7c1f2h4h5g3g4f1h3h7e7f7f8a3h6a8h8b7d1",
			"f5f6e6f4f3c5c4d6g5e3c6g4d2b4c3b5a6e1c1h4h6a5a4a3h5h3c2f2e7d8b3b6d7c8f8e8e2g3g6d1f1c7a2g1h1g8",
			"e6f6f5f4g5e7f7h5e3d3g4h4h3g6g3c6c5f3e2d2h7h2c4f8g7f2d8c2e8d6g8d7e1f1c8c3c7d1b5a6a4b8h6b6a8h8",
			"c4c3d3e3d2c2e2b4f3c5b3f4c1e1f1f2d1a3a4a5g4g3h3h4h5g5g1a2h6g6h2b1a1g2b5f5a6b6b2b7a7a8b8c7d6c6",
			"f5f4e3d6f3g4e6e2g3f2h3g5d3d7h6c4c2d2f1h5h4b2c3b4c1d1e1g1h1h2g2h7b1f6e7g6f7h8c5b3g7b5c6a6a4a1",
			"d3c5f6f5e6e3d6f7g6c4c6e7d7g5f4c8h6c7f3c3b3g4b4c2h5h3h4h7e2d2f2g3b6d1f1a3g2h1h2g1h8e1b5a5a4a6",
			"c4e3f6e6f5c5f4g6f7g5d6d3f3c3h4h5g4h3e2f2d2f1d1g3c2e8b6b5f8c7d7c8d8g8e7b8c6a5a4a3a6b4a2b3b2e1",
			"f5d6c5f4d7f6d3c3b3d2e1d1c1b4f3e3g3c6c4e6c2b6e2g5a4f2f7e7e8a3a2b5g6h3h5h6g4f1c7h4g1c8d8f8g7b8",
			"d3c3c4c5e6e3c6d6b4b3b6a4d7f4f3f5f6g5e2g6b5c7d8c2d2a5a6a7c1f2h4h5g3g4f1h3h7e7f7f8e8c8h6h8a2a3"
		];
		setLevel(4);

		Queue.message("計算中ぜよ。");
		var total = 0, str = "";
		calc(0);

		function calc(i) {
			Rule.init();
			for (var j = 0; j + 1 < recordList[i].length; j += 2) {
				var col = "abcdefgh".indexOf(recordList[i].substring(j, j + 1).toLowerCase());
				var row = "12345678".indexOf(recordList[i].substring(j + 1, j + 2));
				if (col == -1 || row == -1) break;

				var square = col + row * 8;
				if (!Rule.canFlip(square)) break;
				Rule.flip(square);
			}

			var startTime = performance.now();
			move(function () {
				var time = performance.now() - startTime;
				total += time;
				str += recordList[i].substring(0, 6) + "… " + time / 1000 + "秒<br />";

				changeCharaImg("normal");
				if (i < recordList.length - 1) {
					calc(i + 1);
				} else {
					Queue.message(str + "総時間は " + total / 1000 + "秒 だぜよ。");
				}
			});
		}
	};
	$(window).on("load", function () {
		setTimeout(test, 3000);
	});*/

	// 勝率統計
	/*async function stat() {
		const count = 100;
		const moveRandList = [0, 250, 350, 450, 550, 800];

		Queue.message("計算中ぜよ。");
		var str = "結果だぜよ。<br />";

		for (var i = 1; i <= 4; i++) {
			str += "コンピューターレベル" + i + "<br />";

			for (var j in moveRandList) {
				str += "調子" + moveRandList[j];

				var playerWin = 0;
				var playerDiscNum = 0;

				for (var k = 0; k < count; k++) {
					disc = (k < Math.floor(count / 2) ? Board.WHITE : Board.BLACK);
					Rule.init();

					for (;;) {
						var turn = Rule.getTurn().disc;
						if (turn == null) break;

						var square;
						if (turn == disc) {
							setLevel(i);
							moveRand = moveRandList[j];
							square = await moveCom();
						} else {
							// ランダム打ち
							var moveSquare = [];
							for (var l = 0; l < 64; l++) {
								if (Rule.canFlip(l)) moveSquare.push(l);
							}
							square = moveSquare[Math.floor(Math.random() * moveSquare.length)];
						}
						Rule.flip(square);
					}

					var discNum = Rule.getDiscNum();
					var playerDiscNum;
					if (disc == Board.BLACK) {
						discNum.black = discNum.white;
						discNum.diff = -discNum.diff;
					}

					if (discNum.diff > 0) {
						playerWin++;
						playerDiscNum += discNum.black + discNum.empty;
					} else if (discNum.diff < 0) {
						playerDiscNum += discNum.black;
					} else {
						playerDiscNum += 32;
					}
				}
				str += " 勝率" + Math.round(playerWin / count * 100) + "% 平均獲得石数" + (Math.round(playerDiscNum / count * 100) / 100) + "石<br />";

				if (i >= 4) break;
			}
		}
		Queue.message(str);

		function moveCom() {
			return new Promise(function (resolve) {
				move(function (response) {
					resolve(response.move);
				});
			});
		}
	}
	$(window).on("load", function () {
		setTimeout(stat, 3000);
	});*/

	// プレイヤーの手番のときのメッセージ
	//   score 評価値
	//   depth 読み手数
	function getPlayerTurnMessage(score, depth) {
		var msg = "";
		posRand = 0;

		if (score == null || depth == null) {
			// 初期設定
			changeCharaImg("normal");
			status = NaN;
		} else if (depth <= -2 || score >= 8000 || score <= -8000) {
			// 完全読み
			if (score >= 8000) score -= 8000;
			if (score <= -8000) score += 8000;
			if (score >= 64) {
				changeCharaImg("win64");
				if (status > 301) {
					msg = "おおっ、お前は最悪にもほどがある打ち方をしましたなあ。";
				} else {
					msg = rand([
						"見なさい。最高の光がともっておりますよぉ。",
						"完全勝利ですなぁ、ハハハハハ。",
						"相手を間違っておりますぞ。アハハハハハハ。",
						"お前は完全なる闇にいる。",
						"こんなことでは、お前の救いようもないぞ…。"
					]);
				}
				status = 301;

			} else if (score >= 50) {
				changeCharaImg("win50");
				if (status > 302) {
					msg = "ハハハハハ、最高の光が見え始めてますねぇ。";
				} else {
					msg = rand([
						"光は私にともっています。",
						"愚かな相手と戦ったものですね。",
						"私もバカだな。お前みたいなやつ相手に全滅もできんのか…。",
						"私もなめられたものだな、お前みたいなやつと互角と思われようとは…。",
						"You are very fool !!",
						"これが、お前の実力だ。どうなるか予想つくかね？"
					]);
				}
				status = 302;

			} else if (score >= 40) {
				changeCharaImg("win40");
				if (status > 303) {
					msg = "へっへっへっへっへっへっへっへ。<br />ハッハッハッハッハ。";
				} else {
					msg = rand([
						"へっへっへ、余裕だぜよ。",
						"お前が下手打ってくれてラッキーだぜ。",
						"ラッキーチャチャチャだな。",
						"余裕。余裕。",
						"勝つ。勝つ。絶対にな！",
						"へっへっへっへ、楽勝だぜよ。"
					]);
				}
				status = 303;

			} else if (score >= 30) {
				changeCharaImg("win30");
				if (status > 304) {
					msg = "おおっ、光がきましたなぁ。";
				} else {
					msg = rand([
						"フフフ、ヘヘヘ、ハハハ。",
						"光がきてますよぉ。",
						"光がある限り、俺は負けんぜ。",
						"勝てる光が見えますねぇ。",
						"うむうむ。",
						"よしよし、十分だ。",
						"……へへへへへ。"
					]);
				}
				status = 304;

			} else if (score >= 20) {
				changeCharaImg("win20");
				if (status > 305) {
					msg = "フッ、馬鹿目が！";
				} else {
					msg = rand([
						"……もらった。",
						"……勝った。",
						"……お前は、まもなく敗者だ。",
						"……ふっ。",
						"ふふふ、勝つ！",
						"勝利の光が見えかけてますねぇ。"
					]);
				}
				status = 305;

			} else if (score > 10) {
				changeCharaImg("win10");
				if (status > 306) {
					msg = "下手糞かよ！";
				} else {
					msg = rand([
						"へっへっへ。",
						"はっはっはっは。",
						"ふふふへへ。",
						"へっへ、へっへ。",
						"はっはっ、いいねぇ。",
						"よしよし、良し！"
					]);
				}
				status = 306;

			} else if (score > 4) {
				changeCharaImg("win4");
				if (status > 307) {
					msg = "あーあ、お前打ってはならないところに打っちまったなぁ。";
				} else {
					msg = rand([
						"よしよし、OK、OK。",
						"とりあえず……勝ち！",
						"勝てば良し！",
						"うんうん。",
						"まあ、OKだな。",
						"OK、OK。勝てば問題なし。",
						"うむうむ、うんうん。"
					]);
				}
				status = 307;

			} else if (score >= -4) {
				changeCharaImg("normal");
				if (status > 308) {
					msg = "ふぅ～、互角まで持ち込めたか。";
				} else {
					msg = rand([
						"互角な戦いだな。",
						"互角ですな。",
						"勝っても負けても悔いなしですかな。",
						"俺達、いいライバルになれるかもな。",
						"うむ。",
						"ふむふむ。"
					]);
				}
				status = 308;

			} else if (score >= -10 && level >= 2) {
				changeCharaImg("loss4");
				if (status > 309) {
					msg = "おい、もっと変なところに打てよ。";
				} else {
					msg = rand([
						"ちぇっ、あと少しなのによ。",
						"ちぇっ、つまんねーの。",
						"くそっ、あと少しじゃねーかよ。",
						"頼むから、お前変なとこに打てよ。",
						"お前が悪手に打つのを願うっきゃねーか。",
						"お前が負けるようなところに打てよ。"
					]);
				}
				status = 309;

			} else if (score > -20 && level >= 2) {
				changeCharaImg("loss10");
				if (status > 310) {
					msg = "悪手に打つんだよ！";
				} else {
					msg = rand([
						"ぐそー(泣)",
						"くっそー、くやぴー。",
						"ちくしょう！",
						"ぐっそー、腹が立つぅ！",
						"くそったれぇ！",
						"クヤシイー!!"
					]);
				}
				status = 310;
				posRand = 10;

			} else if (score > -30 && level >= 2) {
				changeCharaImg("loss20");
				if (status > 311) {
					msg = "あぐじゅに(悪手に)…。";
				} else {
					msg = rand([
						"いすかきてせらすきにたませらひき(狂)。",
						"シチシチトシチトシチシチトチトシチイスハ(狂)。",
						"あろぱるぱ、はるば(狂)。",
						"ぢゅっちょー(ぐっそー)。",
						"んめめんめめんめめめめぺーー(狂)。",
						"ギャーキクラセマトシセラハンイキマラマラクマクトイハシニキマクテトニハキ(狂)。"
					]);
				}
				status = 311;
				posRand = 14;

			} else if (score > -40 && level >= 2) {
				changeCharaImg("loss30");
				if (status > 312) {
					msg = "お前がそんなところに打ってもこんなんかよ！ ブッ！";
				} else {
					msg = rand([
						"………(爆)。",
						"ガッ‥‥‥‥。",
						"ガ━━━━━━━━━ン！",
						"････グッ･････。",
						"ゥゲッ…。",
						"ゲッ………。"
					]);
				}
				status = 312;
				posRand = 14;

			} else if (score > -50 && level >= 2) {
				changeCharaImg("loss40");
				if (status > 313) {
					msg = "光どころか、<b><font color='red'>血</font></b>ドハァ！";
				} else {
					msg = rand([
						"悪手にいいぃぃ！",
						"ギャッ<font color='red'>(血)</font>！",
						"グギャーーー！",
						"ゴギャーー!!",
						"ギャーーーーーーーーーーーーーー!!!",
						"<font color='red'>(血)</font>ドパァ！",
						"ごがぁーーーーー!!!!!!!"
					]);
				}
				status = 313;
				posRand = 14;

			} else if (score > -64 && level >= 2) {
				changeCharaImg("loss50");
				if (status > 314) {
					msg = "死んだも同然の暗闇にいます…。";
				} else {
					msg = rand([
						"暗闇が私をおおっております…。",
						"あんた、大悪手に打ちなさい……。",
						"お前のほうに光が見える…。",
						"ぐやぴー(爆)！！",
						"今すぐ、アプリを閉じなさい。",
						"…………。"
					]);
				}
				status = 314;
				posRand = 14;

			} else if (level >= 2) {
				if (depth != -3) {
					changeCharaImg("worst");
					msg = rand([
						"嘘だろ！？ 嘘だと言ってくれ…。",
						"待て待て待て待て！ 冗談きついぜ…。",
						"シャレになってねぇよ、おい…‥。",
						"このままじゃ死んじまうぜよ。",
						"おい！ 今すぐアプリを閉じるんだ！！",
						"これはヤバすぎる……。相手の悪手を祈ってる場合じゃねぇ！"
					]);
				} else {
					changeCharaImg("loss64");
					msg = "(死)";
				}
				status = 315;
				posRand = 20;
			}
		} else if (depth == -1) {
			// 必勝読み
			if (score > 0) {
				changeCharaImg("best");
				if (status >= 104 && status <= 105) {
					msg = "と、思わせておいてWin！";
				} else {
					msg = rand([
						"ははははは。",
						"がはははは。",
						"ひゃっひゃっひゃっ。",
						"ひょっひょっひょっ。",
						"へっへっへ、Win！",
						"アハハハ。"
					]);
				}
				status = 201;
			} else if (score == 0) {
				changeCharaImg("normal");
				msg = rand([
					"ほぉ…。",
					"……互角！",
					"ふんふん、うむうむ。",
					"うむ…。",
					"………。"
				]);
				status = 202;
			} else if (level >= 2) {
				changeCharaImg("loss");
				if (status >= 101 && status <= 102) {
					msg = "げっ、まじで…。<br />ガ━━━━ン!!";
				} else {
					msg = rand([
						"……。",
						"ガーン。",
						"…。",
						"……情けねー。",
						"…くそっ。"
					]);
				}
				status = 203;
				posRand = 10;
			}
		} else if (depth == 0) {
			// 序盤
			changeCharaImg("normal");
			if (score >= 10) {
				msg = rand([
					"お前、あんま良くないと思うぜ。",
					"このままなら楽して勝てるか？",
					"", "", ""
				]);
			} else if (score >= 6) {
				msg = rand([
					"俺に有利でも、まだ分からねぇ。<br />お前の手番だぜよ。",
					"ちょっぴり俺に有利だな。<br />お前の手番だぜよ。",
					"", "", ""
				]);
			} else if (score >= 4) {
				msg = rand([
					"まだまだ序盤だぜよ。<br />お前の手番だ。",
					"ふんふん、定石ですな。<br />お前の手番だぜよ。",
					"", "", ""
				]);
			} else if (score > -4) {
				msg = rand([
					"定石打ちだ。しかも、互角。<br />お前の手番だぜよ。",
					"ふむふむ、定石ね。<br />お前の手番だぜよ。",
					"", "", ""
				]);
			} else if (score > -6) {
				msg = rand([
					"むむ、ちょっと俺が不利だな。<br />お前の手番だぜよ。",
					"", "", "", ""
				]);
			} else if (score > -10) {
				msg = rand([
					"俺不利だけど、まぁいいや。<br />お前の手番だぜよ。",
					"既に俺が不利か……。<br />お前の手番だぜよ。",
					"", "", ""
				]);
			} else {
				msg = rand([
					"お前に有利な状況だぜ。",
					"", "", "", ""
				]);
			}
			status = 103;
		} else if (level >= 2) {
			// 中盤
			if (score >= 200) {
				changeCharaImg("best");
				msg = rand([
					"光は私がもらいます。｢勝利の光｣をね！",
					"これはすごいぞ、かなり優勢な気がしてきた。もしかすると勝勢かもしれねーぜ。へっへっへ。",
					"ガハハハハハハハハハハハハハハハハハハハハハハ。",
					"いーねーいーねー、勝てそうだぜよ。",
					"ッシャーーー！",
					"ハッハッハッハッハ。",
					"いいぜ！ いいぜ！",
					"ははははは、この調子だ！",
					"勝利は既に手に入れたようなものだな。"
				]);
				status = 101;

			} else if (score >= 100) {
				changeCharaImg("better");
				if (status < 102) {
					msg = rand(["光はまだ私の近くにいます！", "まだ優勢のはずだ！"]);
				} else {
					msg = rand([
						"光が私にともろうとしています。",
						"うむうむ。",
						"光が見えようとしていますね。",
						"光が私のほうに近づいていますね。",
						"ふふっ。",
						"良しですねぇ。",
						"いい感じだ。",
						"よしよし…。",
						"この形勢をより良くしていきたいところ。"
					]);
				}
				status = 102;

			} else if (score > -20) {
				changeCharaImg("normal");
				switch (status) {
				case 101:
					msg = rand(["おや、せっかくの形勢が…。", "む、せっかくの光が。", "ありゃ・・・。"]);
					break;
				case 102:
					msg = rand(["ちっ、今の光は気のせいか？", "けっ。だが、まだいけるはず。"]);
					break;
				case 104:
					msg = rand(["ふー、危ない危ない。", "ふぅー、危なかったぜ。"]);
					break;
				case 105:
					msg = rand(["よし、お前が下手なところに打って助かったぜ。", "うむ、気のせいで済んだか。"]);
					break;
				}
				status = 103;

			} else if (score > -80) {
				changeCharaImg("worse");
				if (status > 104) {
					msg = rand(["ふー、不利は避けられたか…。", "ふぅ････少し持ち直したか。"]);
				} else {
					msg = rand([
						"むむっ。私に劣勢の流れが来ているようですね。",
						"むむむむむぅ…。",
						"私に重い空気が流れてますねぇ、うーむ。",
						"・・・この形勢は・・・。",
						"……ぐぐっ。",
						"ムム・・・。",
						"何やら不穏な流れが…。",
						"これが気のせいであることを願うばかりだが‥。",
						"･･････。"
					]);
				}
				status = 104;

			} else {
				changeCharaImg("worst");
				if (status <= 103) {
					msg = rand([
						"ぐっ、やっちまったか‥！ やばいぞ、これ。",
						"あ・・・・！",
						"って……、こいつはマズいのでは！",
						"ゲッ、ヤバ…！",
						"あっっ!!",
						"ああああ、しくったかも‥。"
					]);
				} else {
					msg = rand([
						"こいつはやばいぞ。かなり劣勢では、いや、敗勢なんてことは…。",
						"おい、お前！コンピュータオセロ使ってズルしてんじゃねーだろうなぁ？",
						"激ヤバじゃねーかよ。まずいぞ、これは。",
						"ムムム……(汗)。",
						"お前、悪手に打つんだ！",
						"・・・・(汗)。",
						"ぐっ、馬鹿な……。",
						"あわわわ‥‥。",
						"…あぁ‥ああ・・・。",
						"ここで負けるわけには‥‥。",
						"････ゴクリ････。",
						"これは気のせいだと言ってくれ！",
						"ぁあ…‥･･・あ・・。"
					]);
				}
				status = 105;
				posRand = 10;
			}
		}

		return msg == "" ? "お前の手番だぜよ。" : msg;
	}

	// パスのときのメッセージ
	//   index 種類
	function getPassMessage(index) {
		var msg;

		switch (status) {
		case 301:
		case 201:
		case 101:
			msg = [
				["お前はパスするしかない。もう一度私の手番だ。", "また私の手番か、クククケケケ。", "ハッハッハ、連続パスは大敗の予兆だよ。"],
				["私はパスだ。もう一度お前の手番だぞよ。", "私の敷いたレールに従うしかない。"]
			];
			break;
		case 302:
		case 102:
			msg = [
				["お前はパスだ。もう一度俺が打たせてもらう。", "また俺の番か、フッ。"],
				["俺はパスだ。もう一度お前の番だ。", "もう一度お前の手番だ。"]
			];
			break;
		case 307:
			msg = [
				["もう一度俺の番だぜ。", "また俺が打つぜ。"], ["俺はパスだ。", "打てる所がないんで。"]
			];
			break;
		case 309:
			msg = [
				["もう一回俺の手番か。", "また俺か。"], ["俺はパスか…。", "ちぇっ、変な所に頼むぜ。"]
			];
			break;
		case 310:
			msg = [
				["また俺の手番だけど…。", "うれしくない‥‥。"], ["パスか……。", "ぐ…。"]
			];
			break;
		case 311:
			msg = [
				["ぱすぱすぱす。"], ["パスパスパス。", "すパスパスパスぱ。"]
			];
			break;
		case 312:
		case 203:
			msg = [
				["相手がパスしたって……。", "‥‥‥‥。"],
				["げっ……。", "ぐぐ…！", "…ガッ…。"]
			];
			break;
		case 313:
			msg = [
				["ぐ……。", "<font color='red'>…グフッ。</font>"],
				["ぐ……<b><font color='red'>ポッ！</font></b>", "<font color='red'>血</font>が…<font color='red'>血</font>が……。"]
			];
			break;
		case 314:
			msg = [
				["……。", "私はあなたに踊らされているのでしょうね………。"],
				["…さぞ余裕なんでしょうね……。", "このまま永遠の闇へと続くのでしょうか……。", "アプリを閉じるべきです……。"]
			];
			break;
		case 315:
			msg = [
				["…………。", "死にたくねぇよ……！", "ぐっ‥‥頼む！"],
				["いよいよもって、やべぇんじゃ…？", "‥‥これはヤバい。", "嘘だ……！", "死ぬ……！ 死んじまうぅぅ……。"]
			];
			break;
		case 104:
			msg = [
				["もう一度俺の番…、だが……。", "逆転の手になるか…？"], ["くっ…。", "…むむむむ。"]
			];
			break;
		case 105:
			msg = [
				["くそ、これで挽回できるか？", "頼む…！"],
				["これはかなりマズいのでは…(汗)。", "‥‥もしかして、相当やばい？", "おいおい……。"]
			];
			break;
		default:
			msg = [
				["お前はパスだから、もう一度俺の手番だぜ。", "お前は打てる箇所がない。俺の番だ。"],
				["俺はパスだから、もう一度お前の手番だぜ。", "俺は打てる箇所がない。またお前の番だ。"]
			];
			break;
		}

		return rand(msg[index]);
	}

	// 打てない箇所に打とうとしたときのメッセージ
	//   index 種類
	function getCantFlipMessage(index) {
		var msg;

		switch (status) {
		case 301:
			msg = [
				["どうあがいても無駄だよ。", "<b>無様な敗北</b>からは逃れられんよ。", "無駄ですぞ。"],
				["打ち間違えたのかね？", "落ち着きなさい。", "何をしているのです？"],
				["さ、待っても何も始まりませんよ。", "さぁ、あなたの出番ですよ。そして、むせび泣きなさい。", "結末は揺るぎません。"]
			];
			break;
		case 302:
			msg = [
				["返せない箇所には打てん。", "何がしたいんだ？"],
				["そんなとこに打ってもお前の<b>闇</b>は変わらん。", "そこはすでに石だ！"],
				["まさか私に勝てるとでも思っていないだろうね？", "お前の手番だ、早くするんだ。"]
			];
			break;
		case 303:
			msg = [
				["ひっくり返せるかよ。", "返せねーものは打てん。", "へヘヘへ。"],
				["そんなとこに打てねーよ。", "おいおい、落ち着きなって。", "へっへ。"],
				["そこに打てたら俺に勝てるってのかい？", "そこに打てたら俺に勝てたかもな。"]
			];
			break;
		case 304:
			msg = [
				["落ち着いて打ちな。"],
				["ゆっくり打つんだ。"],
				["ま、俺の勝ちは変わらんがな。", "<b><font color='green'>光</font></b>が俺を勝たせてくれるんだ。", "ククク、一体どうしたってんだい？"]
			];
			break;
		case 305:
			msg = [
				["返せないぜよ。", "ひっくり返せないぜよ。"],
				["そこには打てないぜよ。", "そこは無理だぜよ。"],
				["……俺は勝つ！"]
			];
			break;
		case 306:
			msg = [
				["けへへ、そこは無理ですぜ。", "どうした？"],
				["ふふふふふ。", "ん？ 無理だぜ。"],
				["はっはっ、慌てても結果は変わらん。", "早くしな、へへ。", "打つ場所が違うぞ、へへ。"]
			];
			break;
		case 307:
			msg = [
				["返せないよ。"],
				["すでに石があるよ。"],
				["落ち着いて、そこは無理だからさ。", "ゆっくり打たないと差が広がるかもしれないッス。", "打ち間違いないよう気を付けな。"]
			];
			break;
		case 308:
			msg = [
				["ひっくり返せないぞ。", "そこには打てない。"],
				["打てないって。", "落ち着くんだ、落ち着いて。"],
				["お前の手番だぜよ。", "ゆっくり考えな。", "大事な局面での打ち間違いは致命傷になるかもしれないぜ。"]
			];
			break;
		case 309:
			msg = [
				["そこじゃなくて…。", "おいおい。"],
				["そこには打てないって。"],
				["もっと変な所に打つんだよ。", "悪手に打ってくれよ。", "頼むから変な所にだな…。"]
			];
			break;
		case 310:
			msg = [
				["打てないってばばば。"],
				["そ、そこじゃないぞ。"],
				["早く悪手に…悪手にぃ！", "早く、もっと適当な箇所に打ってくれー。"]
			];
			break;
		case 311:
			msg = [
				["無理ダガら。"],
				["ブ理だから。"],
				[
					"びっ<span style='font-size: 120%;'>くリ</span>が<span style='font-size: 60%;'>え</span>ゼねー<span style='font-size: 110%;'>ジョ</span>",
					"ぞんな<span style='font-size: 120%;'>ドゴろう</span>にブてるが<span style='font-size: 60%;'>が</span>よ(狂)。",
					"ぼ前の番ば、早く打てててテててて。"
				]
			];
			break;
		case 312:
			msg = [
				["返…せ‥な…い‥ぞ。", "‥無…理…だ‥ぞ…。"],
				["打‥て…な‥い…ぞ。"],
				["早く…悪手に・・・・・・。"]
			];
			break;
		case 313:
			msg = [
				["打でぇーーーん<font color='red'>(血)</font>！", "返せな…ドバ！"],
				["ム…リ…。", "何を…し、て…。"],
				["早…く…ドバ！", "ゲホォッ<font color='red'>(血)</font>！", "<b>ギャッ！</b>"]
			];
			break;
		case 314:
			msg = [
				["…そこでは…ない……。"],
				["そこでは……ない…。"],
				["悪手に打つか、アプリを閉じるか選ぶのです……‥。", "私に勝ってもいいことはありません・・。", "早く閉じるべきアプリがあるはずです……。"]
			];
			break;
		case 315:
			msg = [
				["くそっ、そこじゃねぇんだ、そこじゃ……。"],
				["くっ、何してるんだ？", "…おぃ………。"],
				["‥‥………。"]
			];
			break;
		case 202:
			msg = [
				["ひっくり返せねーぜ。", "そこは無理だ。"],
				["そこには打てねー。", "そこじゃねーぞ。"],
				["お前の手番だぜよ。", "今いい勝負なんだから落ち着きな。"]
			];
			break;
		case 203:
			msg = [
				["………。", "……………。"],
				["……。", "…。"],
				["…<span style='font-size: 50%;'>すぐにアプリを</span>……。"]
			];
			break;
		case 201:
		case 101:
			msg = [
				["どこに打っているのです？", "打てる箇所は見えているはずですよ。", "落ち着いて打ちなさい。"],
				["打てませんよ、クク。"],
				["さぁ、次の手を！", "慌てる必要はありません。"]
			];
			break;
		case 102:
			msg = [
				["そこには打てんぜ。", "そこに打っても返せんよ。"],
				["そこにはすでに石があるぞ。", "打てる所をよく見なさい。"],
				["お前の手番だ、早く打つんだ！", "さぁさぁ早く！"]
			];
			break;
		case 104:
			msg = [
				["そ、そこには打てん。", "…打てないぜよ。", "返せない箇所だ…よ。"],
				["何やってるんだ？", "そこには既に石があるから無理だぞ…。"],
				["変な所に打ってもいいんだぞ…。", "早く打ってくれ。", "慌てるように打つんだ。"]
			];
			break;
		case 105:
			msg = [
				["なっ、何してる！？ 余裕のつもりか？", "そこじゃなくて<b><font color='red'>大悪手</font></b>に打つんだ。", "…返せない箇所……だ。"],
				["ちょっと余裕があるからって…。", "くっ、ふざけているのか？", "違う……。"],
				["見逃してほしいなら…アッ、プリを閉じた方がいいぜ…。", "早く打つか、アプリを閉じるか、どっちかにしてくれ。", "ア…アプリを閉じるなら、い…ぃま、今だぞ。"]
			];
			break;
		default:
			msg = [
				["ひっくり返せねーよ！", "どこに打ってんだ。", "そこ違うぞ。"],
				["そんなとこに打てるかよ！", "そこじゃない。", "打つところを間違えたか？"],
				["お前の手番だ、早く打てよな。", "早くしな。", "落ち着いて打ちな。"]
			];
			break;
		}

		return rand(msg[index]);
	}

	//「待った」や「やり直す」際のメッセージ
	//   index 種類
	function getUndoMessage(index) {
		var msg;

		switch (status) {
		case 301:
		case 201:
		case 101:
			msg = [
				rand(["いいでしょう。今更状況が変わるとも思いませんが。", "構いませんよ。"]),
				"本当にいいのですか？",
				"その方があなたのためですが、本当にいいのですか？",
				"では続けましょう。あなたの番です。"
			];
			break;
		case 302:
			msg = ["いいだろう。", "本当にいいのか？", "なんだと？ 本当にいいのか？", "続けるぞよ。"];
			break;
		case 303:
		case 304:
		case 305:
		case 306:
		case 102:
			msg = ["ちっ、まぁいいだろう。", "本当にいいのか？", "本当にいいのか？", "なら、続けるぜ。"];
			break;
		case 307:
			msg = ["打ち間違い？ いいよ。", "本当にいいの？", "本当にいいの？", "続けるっスよ。"];
			break;
		case 309:
			msg = [rand(["なんだよ、もぅ。まぁいいけどさぁ。", "へいへい。"]), "助かるよ。けど、本当？", "助かるよ。けど、本当？", "なんだよ、それ。"];
			break;
		case 310:
			msg = ["やり直してもっと悪い場所に打つんだ。", "ぜひそうしてくれ。", "ぜひそうしてくれ。", "ぐぐ…。"];
			break;
		case 311:
			msg = [
				"びぁーびあー(いいぜ…)。",
				"ダノムがラそうぞうシでクレ(頼むからそうしてくれ)。",
				"ダノムがラそうぞうシでクレ(頼むからそうしてくれ)。",
				"トスラナレマスイ゛ワキニチハ(狂)。"
			];
			break;
		case 312:
		case 313:
		case 203:
			msg = ["…好きに…しろ…。", "……ぜひ…頼む。", "……ぜひ…頼む。", "‥そ‥ん‥な‥‥。"];
			break;
		case 314:
			msg = ["好きにしなさい…。", "……私からも…ぜひ…！", "……私からも…ぜひ…！", "‥そ‥ん‥な‥‥。"];
			break;
		case 104:
			msg = [
				rand(["いいでしょう。", "いいでしょう、できれば悪手に打ってほしいところですが。"]),
				"…本当にいいのですか？",
				"…本当にいいのですか？",
				"ムム、では続け…ますか。あなたの番です。"
			];
			break;
		case 315:
		case 105:
			msg = [rand(["むしろ助かる。もっと悪手に打ち直すんだ。", "……あ、あぁ。いいぜ。"]), "おぉ、マジか？", "おぉ、マジか？", "ぐっ……。"];
			break;
		default:
			msg = [
				"打ち間違えたのか？ いいぜ。",
				"始めからやり直したいのか？",
				"本当にいいんだな？",
				rand(["じゃ、続けるぞ。お前の番だ。", "なら続けるぞ。お前の番だ。"])
			];
			break;
		}

		return msg[index];
	}

	// 思考中のメッセージ
	//   index 種類
	function getThinkingMessage(index) {
		var msg;

		switch (status) {
		case 301:
		case 201:
		case 101:
			msg = [
				["まぁ待ちなさい。最高の手を考えているのですから。", "クク、どこだ？ 最高の頂きへの手は！"],
				["どこだ、どこだぁ？", "クフフ、全てを終わらせる神々しき一手…！"]
			];
			break;
		case 302:
			msg = [
				["最高の一手にするためだ。もう少し待て。"],
				["う～む、どこが最善だぁ？", "ふふふ、震えていなさい。"]
			];
			break;
		case 303:
		case 306:
			msg = [
				["考え中だ、待ちな。", "さぁて、どう料理してやるかだ。"],
				["まだ考えているから待ってろ。", "そう慌てることはねぇ。"]
			];
			break;
		case 304:
		case 305:
			msg = [
				["今考えを巡らせているところだ。", "更なる高みへ思考中だ。"],
				["さぁ来い、勝利の光よ。", "舞い降りよ、神の一手。"]
			];
			break;
		case 307:
			msg = [
				["考えてるから待ってよ。"],
				["うーん……。", "待つのもオセロだよね。"]
			];
			break;
		case 309:
			msg = [
				["もうちょっと掛かるから。", "これ以上石差損したくないから待ってくれ。"],
				["くそー…、逆転の手……。", "う～ん‥……。"]
			];
			break;
		case 310:
		case 312:
		case 313:
		case 203:
			msg = [
				["ググ…もう少し……待て。", "・・・‥‥………。"],
				["もう…少し……。", "‥あと…す、こし‥‥。"]
			];
			break;
		case 311:
			msg = [
				["考えテるがらあばばばババば。"],
				["まだま゛た掛かルル。"]
			];
			break;
		case 314:
			msg = [
				["少し…待ちなさい……。"],
				["待つのが嫌なら…アプリを閉じなさい……。", "・・・・・・・・・。"]
			];
			break;
		case 315:
		case 105:
			msg = [
				["ま、待ってくれ！ きっと思考の先に逆転への一手が……！", "うぅ…、起死回生の手‥起死回生の手…。"],
				["起死回生の手‥‥起死回生の一手……。", "頼む……頼むから……！"]
			];
			break;
		default:
			msg = [
				["考えているから待ってろ。", "さて、この状況をどう見るか……。"],
				["まだ考え中だ。", "もう少し待ってな。"]
			];
			break;
		}

		return rand(msg[index]);
	}

	// 対局終了後のメッセージ
	//   discDiff 石差
	//   black 黒石の数
	//   white 白石の数
	//   oneFlag 続けるかどうか促さない場合にtrueを指定する
	function getEndMessage(discDiff, black, white, oneFlag) {
		getPlayerTurnMessage(discDiff, -3);	// キャラ画像を結果に応じて変更
		var msg;

		if (disc == Board.WHITE) {
			var tmp = black;
			black = white;
			white = tmp;
		}

		switch (status) {
		case 301:
			msg = "私の完全勝利！ ま、実力の差というやつですよ。";
			if (!oneFlag) msg += "<br />で、どうします？";
			break;
		case 302:
			msg = "終わったな。結果は私の大勝だ。";
			if (!oneFlag) msg += "<br />さぁ、続けるかね？";
			break;
		case 303:
			msg = "へっへっ、" + black + "対" + white + "で俺の余裕勝ちでい。";
			if (!oneFlag) msg += "<br />で、続けるのかい？";
			break;
		case 304:
			msg = "終いだな。<b><font color='green'>光</font></b>が私に大勝利をもたらしたのだ。";
			break;
		case 305:
			msg = "俺の勝ちだ。光があれば更なる高みへ上り詰めることができた" + (oneFlag ? "ろう。" : "が、どうするよ？");
			break;
		case 306:
			msg = "よしよし、" + black + "対" + white + "で俺の勝ちだ。";
			if (!oneFlag) msg += "<br />まだやるか？";
			break;
		case 307:
		case 201:
			msg = "終わった。" + black + "対" + white + "で俺の勝ちだ！";
			if (!oneFlag) msg += "<br />さ、どうする？";
			break;
		case 309:
			msg = "終わっちまった。<br />結果は" + black + "対" + white + "でお前の勝ちだ！ ちぇっ。";
			break;
		case 310:
			msg = "くそぉー、" + black + "対" + white + "でお前の勝ちだぁ(泣)。";
			break;
		case 311:
			msg = "びべべぢべべねぶりゆ。";
			if (!oneFlag) msg += "どゅうえゥうするぅ。";
			break;
		case 312:
		case 203:
			msg = "ま゛……さ、か…。";
			break;
		case 313:
			msg = "<b><font color='red' style='font-size: 120%;'>グポォアッ！</font></b>";
			break;
		case 314:
			msg = "あなたの大量勝ちです。とほほほほ。";
			break;
		case 315:
			msg = rand([
				"………(死)",
				"………………(死)",
				"………………………(死)",
				"………………………………(死)",
				"……………………………………………………(死)",
				"(死)"
			]);
			break;
		default:
			if (discDiff > 0) {
				if (level >= 2 && discDiff <= 4) {
					msg = "おっと、終いだ。いい対局だった。<br />結果は、" + black + "対" + white + "で俺の勝ちだ！";
					if (!oneFlag) msg += "<br />で、どうする？";
				} else {
					msg = "おっと、終いだな。<br />結果は、" + black + "対" + white + "で俺の勝ちだ！";
					if (!oneFlag) msg += "<br />で、どうするよ？";
				}

			} else if (discDiff <= -64) {
				var tmp = level;
				level = 2;
				Com.getPlayerTurnMessage(-20, 1);	// キャラ画像をworseにする
				level = tmp;

				msg = "終わった…やるじゃねぇか。て、手加減しすぎたかもな。";
				if (!oneFlag) msg += "<br />どうだ、もう一局いかねぇか？";

			} else if (discDiff <= -30) {
				msg = "終いだ。やるじゃん。結果は、" + black + "対" + white + "でお前の勝ちだ！";
				if (!oneFlag) msg += " 続けるか？";

			} else if (discDiff < 0) {
				if (level >= 2 && discDiff >= -4) {
					msg = "おっと、終いだ。互角な戦いだったな。<br />結果は、" + black + "対" + white + "でお前の勝ちだ！";
					if (!oneFlag) msg += "<br />で、どうする？";
				} else {
					msg = "おっと、終いだな。<br />結果は、" + black + "対" + white + "でお前の勝ちだ！";
					if (!oneFlag) msg += "<br />で、どうすんだ？";
				}

			} else {
				msg = "おっと、終いだな。<br />引き分けか…、互角な戦いができたんじゃねーの？";
				if (!oneFlag) msg += " で、どうする？";
			}
			break;
		}

		return msg;
	}

	//「帰る」ときのメッセージ
	//   index 種類
	function getExitMessage(index) {
		var msg;

		switch (status) {
		case 301:
		case 302:
			msg = ["ではな。アプリを閉じてよいぞ。", "どうした？ ひどい負けっぷりに声も出ないか？"];
			break;
		case 303:
			msg = ["ヘヘ、じゃあな。アプリを閉じていいぜ。", "どうした？ 泣くならアプリを閉じてからにしな。"];
			break;
		case 304:
		case 305:
		case 201:
		case 101:
			msg = ["ではな。アプリを閉じていいぞ。", "まぁ、この結果を眺め続けるのも一考というものか。"];
			break;
		case 306:
			msg = ["じゃあな。アプリを閉じていいぜ。", "ん、どうした？ アプリを閉じな。"];
			break;
		case 307:
			msg = ["では、アプリを閉じていいっスよ。", "ずっとここにいても何もないよ。"];
			break;
		case 309:
			msg = ["じゃあな。アプリ閉じていいぜ。", "アプリ閉じねぇのか？"];
			break;
		case 310:
		case 203:
			msg = ["ではすぐにアプリを閉じなされ。", "アプリを、閉じなされ…！"];
			break;
		case 311:
			msg = ["あぺぺ、閉じさい。", "ああ゛あヴあぺぺぺぺぺぺぺぺぺぺぺぺペぺペペピーポー(狂)"];
			break;
		case 312:
		case 313:
		case 314:
			msg = ["…すぐ、に…アプリを閉じなさい。", "……さらし者にする気……か……。"];
			break;
		case 315:
			msg = ["", ""];
			break;
		case 104:
			msg = ["では、アプリを閉じてくれて構わない。", "と、閉じていいんだぞ。"];
			break;
		case 105:
			msg = ["じゃあすぐにアプリを閉じてくれ。", "恥ずかしいから晒さないでくれよ…。"];
			break;
		default:
			msg = ["んじゃあな。アプリを閉じてくれて構わないぜ。", "このまま待っても何もないぜ。アプリを閉じてくれ。"];
			break;
		}

		return msg[index];
	}

	// キャラ画像設定
	function changeCharaImg(name) {
		if (ysw < 3) {
			$("#messageChara img").attr("src", charaImg[name].src);
		} else {
			$("#messageChara img").removeAttr("src");
		}
	}

	// listからランダムで1つ返す
	function rand(list) {
		return list[Math.floor(Math.random() * list.length)];
	}
}();
