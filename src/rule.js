//
// ルール
//
const Rule = new function () {
	var disc;	// 手番の石の色
	var move;	// 何手目か
	var passFlag;	// パスがあったかどうか

	const record = [];	// 棋譜 [ [手番, 打った箇所, 石を返した箇所...], ... ]
	const markSquare = [];

	this.markSquare = markSquare;

	this.setDisc = function (_disc) {
		disc = _disc;
	};
	this.getTurn = function () {
		return {
			disc: disc,
			passFlag: passFlag,
			move: move
		};
	};

	this.init = init;
	this.canFlip = canFlip;
	this.flip = flip;
	this.undo = undo;
	this.getDiscNum = getDiscNum;
	this.showCanFlip = showCanFlip;
	this.hideCanFlip = hideCanFlip;
	this.showMark = showMark;
	this.hideMark = hideMark;
	this.animCantFlip = animCantFlip;
	this.toC = toC;
	this.toP = toP;

	// 盤面初期化
	function init() {
		for (var i = 0; i < 64; i++) Board.setDisc(i, Board.EMPTY);
		Board.setDisc(27, Board.WHITE);
		Board.setDisc(28, Board.BLACK);
		Board.setDisc(35, Board.BLACK);
		Board.setDisc(36, Board.WHITE);
		Board.setMoveMark(null);

		disc = Board.BLACK;
		move = 0;
		passFlag = false;

		record.splice(0, record.length);

		hideCanFlip();
		markSquare.splice(0, markSquare.length);
	}

	// 指定した箇所に打てるかどうかを返す
	//   square 箇所
	function canFlip(square) {
		if (Board.getDisc(square) != Board.EMPTY) return false;

		// 相手の石の色
		var oppoDisc = (disc == Board.BLACK ? Board.WHITE : Board.BLACK);

		square = toC(square);

		if (canFlipDirection(square, oppoDisc, -9) !== false) return true;	// 上
		if (canFlipDirection(square, oppoDisc, -8) !== false) return true;	// 右上
		if (canFlipDirection(square, oppoDisc, 1) !== false) return true;	// 右
		if (canFlipDirection(square, oppoDisc, 10) !== false) return true;	// 右下
		if (canFlipDirection(square, oppoDisc, 9) !== false) return true;	// 下
		if (canFlipDirection(square, oppoDisc, 8) !== false) return true;	// 左下
		if (canFlipDirection(square, oppoDisc, -1) !== false) return true;	// 左
		if (canFlipDirection(square, oppoDisc, -10) !== false) return true;	// 左上
		return false;
	}

	// 指定した箇所に打つ。打てるかどうかの事前確認はしない
	//   square 箇所
	//   posRand 石の位置をずらす度合い
	function flip(square, posRand) {
		Tick.stopAll("^flip-.+");

		var recordData = [];

		Board.setDisc(square, disc, null, posRand);
		Board.setMoveMark(square);
		recordData.push(disc);
		recordData.push(square);

		// 相手の石の色
		var oppoDisc = (disc == Board.BLACK ? Board.WHITE : Board.BLACK);

		square = toC(square);

		flipDirection(square, -9);	// 上
		flipDirection(square, -8);	// 右上
		flipDirection(square, 1);	// 右
		flipDirection(square, 10);	// 右下
		flipDirection(square, 9);	// 下
		flipDirection(square, 8);	// 左下
		flipDirection(square, -1);	// 左
		flipDirection(square, -10);	// 左上

		// 棋譜に追加
		record.splice(move);	// 打ち直しを考慮して、現在手以降の棋譜を削除する
		record[move] = recordData;
		move++;

		Sound.play(recordData.length < 8 ? "move1" : "move2");

		// 次の手番
		nextTurn();

		function flipDirection(square, direction) {
			square = canFlipDirection(square, oppoDisc, direction);
			if (square === false) return;

			// 打てるので、相手の石を自分の石に変える
			for (;;) {
				square -= direction;
				if (Board.getDisc(toP(square)) != oppoDisc) break;
				Board.setDisc(toP(square), disc, 30, posRand);
				recordData.push(toP(square));
			}
		}
	}

	// 指定した箇所と方向に打てるなら数値、打てないならfalseを返す
	// 指定した位置の次の位置から相手の石が続いた後に自分の石なら打てる
	//   square 箇所
	//   oppoDisc 相手の石の色
	//   direction 方向
	function canFlipDirection(square, oppoDisc, direction) {
		var oppoFlag = false;
		for (;;) {
			square += direction;

			// 壁に到達した場合は打てない
			if (square < 10 || square > 80 || square % 9 == 0) return false;

			// 自分の石、または空所ならループを抜ける
			if (Board.getDisc(toP(square)) != oppoDisc) break;

			oppoFlag = true;
		}

		if (!oppoFlag || Board.getDisc(toP(square)) != disc) return false;

		// 相手の石が1つ以上あった後に自分の石があるので打てる
		return square;
	}

	// 打った石を戻す
	function undo() {
		if (move <= 0) return;
		move--;

		// 手番の設定
		disc = record[move][0];
		passFlag = false;

		// 打った箇所を戻す
		Board.setDisc(record[move][1], Board.EMPTY);
		Board.setMoveMark(move > 0 ? record[move - 1][1] : null);

		// 石を返した箇所を戻す
		var undoDisc = (disc == Board.BLACK ? Board.WHITE : Board.BLACK);
		for (var i = 2; i < record[move].length; i++) Board.setDisc(record[move][i], undoDisc, 30);

		Sound.play("move1");
	}

	// 次の手番
	function nextTurn() {
		for (var pass = 0; pass < 2; pass++) {
			disc = (disc == Board.BLACK ? Board.WHITE : Board.BLACK);

			for (var i = 0; i < 64; i++) {
				if (canFlip(i)) break;
			}
			if (i < 64) break;
		}

		if (pass < 2) {
			// 次の手番がある
			passFlag = pass > 0;

		} else {
			// 両者打てる箇所がもうないので対局終了
			disc = null;
			passFlag = false;
		}
	}

	// 石の数を取得
	function getDiscNum() {
		var black = 0;
		var white = 0;
		for (var i = 0; i < 64; i++) {
			// 石の数を取得
			switch (Board.getDisc(i)) {
			case Board.BLACK:
				black++;
				break;
			case Board.WHITE:
				white++;
				break;
			}
		}

		// 黒石の石差
		var diff = black - white;

		// 空所は勝者のもの
		var empty = 64 - (black + white);
		if (diff > 0) {
			diff += empty;
		} else if (diff < 0) {
			diff -= empty;
		}

		return {
			black: black,
			white: white,
			empty: empty,
			diff: diff
		};
	}

	// 打てる箇所の表示
	function showCanFlip() {
		for (var i = 0; i < 64; i++) {
			if (canFlip(i, disc)) {
				showMark(i, disc);
			} else {
				hideMark(i);
			}
		}
	}

	// 打てる箇所の非表示
	function hideCanFlip() {
		for (var i = 0; i < 64; i++) hideMark(i);
	}

	// 目印の表示
	//   square 箇所
	function showMark(square) {
		var alpha = (move < record.length && record[move][1] == square ? 0.6 : 0.3);

		if (markSquare.length == 0 || markSquare.indexOf(square) == -1) {
			Tick.stop("flip-" + square);
			if (disc == Board.BLACK) {
				Board.setMark(square, 15, 0, 17, 17, alpha);
			} else {
				Board.setMark(square, 15, 255, 238, 238, alpha);
			}
		} else {
			// 強調アニメーション
			var mode = 0;
			Tick.interval("flip-" + square, function () {
				var size, duration;
				switch (mode) {
				case 0:
					size = 15;
					duration = null;
					mode = 1;
					break;
				case 1:
					size = 25;
					duration = 500;
					mode = 2;
					break;
				default:
					size = 15;
					duration = 500;
					mode = 1;
					break;
				}
				if (disc == Board.BLACK) {
					Board.setMark(square, size, 0, 17, 17, alpha, duration);
				} else {
					Board.setMark(square, size, 255, 238, 238, alpha, duration);
				}
				return true;
			}, 500);
		}
	}

	// 目印の非表示
	//   square 箇所
	function hideMark(square) {
		Tick.stop("flip-" + square);
		Board.setMark(square, 0);
	}

	// 打てないことを示すアニメーション
	//   square 箇所
	//   showFlag マークを表示する場合にtrueを指定する
	function animCantFlip(square, showFlag) {
		var nextFlag = false;

		Tick.interval("flip-" + square, function () {
			if (!nextFlag) {
				if (disc == Board.BLACK) {
					Board.setMark(square, 50, 0, 17, 17, 0.6);
				} else {
					Board.setMark(square, 50, 255, 238, 238, 0.6);
				}
				nextFlag = true;
				return true;
			} else {
				if (showFlag) {
					showMark(square, disc);
				} else {
					Board.setMark(square, 0);
				}
				return false;
			}
		}, 200);
	}

	// 計算しやすいようにsquareを
	//             wwwwwwwww
	// ........    w........
	// ........    w........
	// ........    w........
	// ...ox... → w...ox...
	// ...xo...    w...xo...
	// ........    w........
	// ........    w........
	// ........    w........
	//             wwwwwwwwww
	// のように壁で止めれる形式に変換する
	function toC(square) {
		return square + 9 + Math.floor(square / 8) + 1;
	}

	// toCの逆
	function toP(square) {
		return square - 9 - Math.floor(square / 9);
	}
}();
