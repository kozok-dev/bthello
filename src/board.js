//
// 盤面
//
const Board = new function () {
	const BLACK = -1;
	const EMPTY = 0;
	const WHITE = 1;
	const DISC_SIZE = 45;	// 石のサイズ

	const self = this;

	this.BLACK = BLACK;
	this.EMPTY = EMPTY;
	this.WHITE = WHITE;
	this.createBoard = createBoard;
	this.setDisc = setDisc;
	this.setMark = setMark;
	this.setMoveMark = setMoveMark;
	this.click = function (square) {};
	this.getDisc = function (square) {
		var meta = Tick.getMetaValue("disc-" + square);
		return meta == null ? 0 : meta.disc;
	};

	// 盤面作成
	function createBoard() {
		var $board = $("#board");

		for (var i = 0; i < 8; i++) {
			// A～H
			$board.append($createElem("text").attr({
				x: i % 8 * 100 + 72,
				y: 22,
				fill: "#eee",
				"font-weight": "bold",
				"font-size": 20
			}).text("ABCDEFGH".substring(i, i+1)));

			// 1～8
			$board.append($createElem("text").attr({
				x: 7,
				y: i % 8 * 100 + 92,
				fill: "#eee",
				"font-weight": "bold",
				"font-size": 20
			}).text(i + 1));
		}

		// square
		for (var i = 0; i < 64; i++) {
			$board.append($createElem("rect").attr({
				fill: "rgb(0, " + (187 - (i % 8 + Math.floor(i / 8)) * 3) + ", " + (68 - (i % 8 + Math.floor(i / 8))) + ")",
				x: i % 8 * 100 + 30,
				y: Math.floor(i / 8) * 100 + 30,
				width: 97,
				height: 97,
				rx: 5,
				ry: 5
			}));
		}

		// 中央4x4隅の円
		$board.append($createElem("circle").attr({fill: "#021", cx: 2 * 100 + 28, cy: 2 * 100 + 28, r: 7}));
		$board.append($createElem("circle").attr({fill: "#021", cx: 6 * 100 + 28, cy: 2 * 100 + 28, r: 7}));
		$board.append($createElem("circle").attr({fill: "#021", cx: 2 * 100 + 28, cy: 6 * 100 + 28, r: 7}));
		$board.append($createElem("circle").attr({fill: "#021", cx: 6 * 100 + 28, cy: 6 * 100 + 28, r: 7}));

		// square
		for (var i = 0; i < 64; i++) {
			var $square = $createElem("g").addClass("square");
			var $disc = $createElem("g").addClass("discGroup");

			// 目印
			$square.append($createElem("circle").attr({
				fill: "",
				cx: i % 8 * 100 + 78,
				cy: Math.floor(i / 8) * 100 + 78,
				r: 0,
				class: "mark"
			}));

			// 石影
			$disc.append($createElem("ellipse").attr({
				fill: "rgba(0, 0, 0, 0.3)",
				cx: i % 8 * 100 + 82,
				cy: Math.floor(i / 8) * 100 + 82,
				rx: DISC_SIZE,
				ry: 0,
				filter: "url(#blur)",
				transform: "rotate(45 " + (i % 8 * 100 + 82) + " " + (Math.floor(i / 8) * 100 + 82) + ")",
				class: "shadow"
			}));

			// 石
			$disc.append($createElem("ellipse").attr({
				fill: "",
				cx: i % 8 * 100 + 78,
				cy: Math.floor(i / 8) * 100 + 78,
				rx: DISC_SIZE,
				ry: 0,
				transform: "rotate(45 " + (i % 8 * 100 + 78) + " " + (Math.floor(i / 8) * 100 + 78) + ")",
				class: "disc"
			}));

			$square.append($disc);

			// イベント用
			$square.append($createElem("rect").attr({
				fill: "transparent",
				x: i % 8 * 100 + 40,
				y: Math.floor(i / 8) * 100 + 40,
				width: 77,
				height: 77
			}).click(function (square) {
				return function () {
					self.click(square);
				}
			}(i)));

			$board.append($square);
		}

		// 着手した箇所を示すマーク
		$board.append($createElem("polygon").attr({
			id: "moveMark",
			points: "112,35 122,35 122,45",
			fill: "#e33",
			stroke: "#e33",
			"stroke-width": 3,
			"stroke-linejoin": "round"
		}).hide());

		function $createElem(name) {
			return $(document.createElementNS("http://www.w3.org/2000/svg", name));
		}
	}

	// 盤面の指定したsquareにdiscを設定する
	//   square 位置
	//   disc 石の色
	//   delay アニメーション開始時間
	//   posRand 石の位置をずらす度合い
	function setDisc(square, disc, delay, posRand) {
		var $square = $("#board .square").eq(square);

		var x = (posRand == null ? 0 : Math.random() * posRand - posRand / 2);
		var y = (posRand == null ? 0 : Math.random() * posRand - posRand / 2);

		// 経過時間に応じた石を表示するアニメーション
		Tick.once("disc-" + square, {disc: disc, x: x, y: y}, function (value) {
			// 石の色
			var fill;
			if (value.disc <= 0) {
				fill = "url(#black) #011";
			} else {
				fill = "url(#white) #fee";
			}

			// 表示
			if (value.x == 0 && value.y == 0) {
				$square.find(".discGroup").removeAttr("transform");
			} else {
				$square.find(".discGroup").attr("transform", "translate(" + value.x + ", " + value.y + ")");
			}
			$square.find(".shadow").attr("ry", DISC_SIZE * Math.abs(value.disc));
			$square.find(".disc").attr({
				fill: fill,
				ry: DISC_SIZE * Math.abs(value.disc)
			});
		}, 200, delay);
	}

	// 目印を指定したsquareに設定する
	//   square 位置
	//   size サイズ
	//   r 赤
	//   g 緑
	//   b 青
	//   a 透明度
	//   duration アニメーション時間
	function setMark(square, size, r, g, b, a, duration) {
		var $square = $("#board .square").eq(square);

		// 経過時間に応じた石を表示するアニメーション
		Tick.once("mark-" + square, {size: size, r: r, g: g, b: b, a: a}, function (value) {
			// 表示
			$square.find(".mark").attr({
				fill: "rgba(" + Math.floor(value.r) + ", " + Math.floor(value.g) + ", " + Math.floor(value.b) + ", " + value.a + ")",
				r: value.size
			});
		}, duration || 200);
	}

	// 着手した箇所を示すマークをsquareに設定する
	//   square 位置
	function setMoveMark(square) {
		var $moveMark = $("#moveMark");
		if (square == null) {
			$moveMark.hide().removeAttr("transform");
		} else {
			$moveMark.show().attr("transform", "translate(" + (square % 8 * 100) + ", " + (Math.floor(square / 8) * 100) + ")");
		}
	}
}();
