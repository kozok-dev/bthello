//
// コンピューター思考Worker
//
const BLACK = 0;
const WHITE = 1;
const EMPTY = 2;

//    0～     90      91 board
//   91～    154      64 emptySquare
//  155～   1154    1000 record
// 1155～2175599 2174445 evalData
const heap = new ArrayBuffer(0x400000);

const board = new Uint8Array(heap, 0, 91);	// 盤面
const emptySquare = new Uint8Array(heap, 91, 64);	// 空所表
var empty;	// 空所数

const record = new Uint8Array(heap, 155, 1000);

const bookData = new Uint32Array(551350);	// 定石データ
const evalData = new Int8Array(heap, 1155, 2174445);	// 評価値データ

onmessage = function (event) {
	if (event.data.bookImgData != null && event.data.evalImgData != null) {
		// 初回処理と見なす
		create(event.data.bookImgData, event.data.evalImgData);
	} else {
		board.set(event.data.board);
		search(event.data.disc, event.data.depthMid, event.data.depthExact, event.data.depthWld, event.data.moveRand);
	}
};

// 画像のピクセルデータから思考データを作成する(RedとBlueが逆転しているのと、Alphaを考慮)
//   bookImgData 定石Canvas画像ピクセルデータ
//   evalImgData 評価値Canvas画像ピクセルデータ
function create(bookImgData, evalImgData) {
	var i, j;

	// 定石データ
	var bookDataTmp = new Uint8Array(bookData.buffer);
	for (i = j = 0; i < bookImgData.length && j < bookDataTmp.length; i += 4, j += 3) {
		bookDataTmp[j] = bookImgData[i + 2];
		bookDataTmp[j + 1] = bookImgData[i + 1];
		bookDataTmp[j + 2] = bookImgData[i];
	}
	if (j < bookDataTmp.length) {
		postMessage(false);
		return;
	}

	// 評価値データ
	for (i = j = 0; i < evalImgData.length && j < evalData.length; i += 4, j += 3) {
		evalData[j] = evalImgData[i + 2];
		evalData[j + 1] = evalImgData[i + 1];
		evalData[j + 2] = evalImgData[i];
	}
	if (j < evalData.length) {
		postMessage(false);
		return;
	}

	postMessage(true);
}

// 探索
//   disc 手番の石の色
//   depthMid 中盤の読み手数
//   depthExact 完全読み手数
//   depthWld 必勝読み手数
//   moveRand 打つ手の変化度合い
function search(disc, depthMid, depthExact, depthWld, moveRand) {
	// 打つ個所の基本優先順位
	const movePriority = [
		10, 17, 73, 80,	// 隅
		40, 41, 49, 50,	// 中央2x2(初期配置なので打てないが)
		31, 32, 39, 42, 48, 51, 58, 59,	// ボックスコーナー
		30, 33, 57, 60,	// ボックスの隅
		22, 23, 38, 43, 47, 52, 67, 68,	// 中辺のコーナー中央
		12, 15, 28, 35, 55, 62, 75, 78,	// A
		13, 14, 37, 44, 46, 53, 76, 77,	// B
		21, 24, 29, 34, 56, 61, 66, 69,	// 中辺の隅隣り
		11, 16, 19, 26, 64, 71, 74, 79,	// C
		20, 25, 65, 70	// X
	];

	// 石差と空所の計算
	var discDiff = 0;
	empty = 0;
	for (var i = 0; i < movePriority.length; i++) {
		switch (board[movePriority[i]]) {
		case BLACK:
			discDiff += (disc == BLACK ? 1 : -1);
			break;
		case WHITE:
			discDiff += (disc == WHITE ? 1 : -1);
			break;
		default:
			emptySquare[empty++] = movePriority[i];
			break;
		}
	}

	asm.initRC();

	var move = [];
	var scoreMax = null;

	// 相手の石の色
	var oppoDisc = 1 - disc;

	// 定石探索
	for (var i = 0; i < empty; i++) {
		if (!asm.flip(emptySquare[i], disc)) continue;
		var score = searchBook(oppoDisc);
		asm.undo(oppoDisc, 0);

		if (score === false) continue;	// 見つからなかった

		var scoreCmp = randScore(score, moveRand / 10);	// moveRandは中盤用の値を想定しているので、定石は一定値で割る

		if (move.length == 0 || scoreCmp > scoreMax) {
			// 最大評価値更新
			move.splice(0, move.length);
			move.push({move: emptySquare[i], score: score});
			scoreMax = scoreCmp;
		} else if (scoreCmp == scoreMax) {
			// 最大評価値と同じ値は追加
			move.push({move: emptySquare[i], score: score});
		}
	}

	var depth;
	if (move.length > 0) {
		depth = 0;

	} else {
		// 先読み手数
		depth = depthMid;
		if (empty <= depthExact) {
			depth = -2;
		} else if (empty <= depthWld) {
			depth = -1;
		}

		// 評価関数の段階の計算
		var stage = Math.floor((60 - empty + depthMid - 9) / 4);
		if (stage < 0) {
			stage = 0;
		} else if (stage > 12) {
			stage = 12;
		}

		asm.init(empty, depth, stage);

		// 打てる箇所を取得する
		var moveSquare = [];
		for (var i = 0; i < empty; i++) {
			if (!asm.flip(emptySquare[i], disc)) continue;

			var score = 0;
			if (depth == -2 && empty > 10 || depth == -1) {
				// αβ法は良い手順から探索するほど高速化するので、空所が多い完全読みは良さそうな手から、
				// 必勝読みは勝てる手でも石差損を減らすため、それぞれ中盤読みで並べ替えるようにする
				score = -asm.searchMidAlphaBeta(oppoDisc, depthMid - 1, -discDiff - (asm.getRC() - 1) * 2 - 1, 0, -8064, 8064);
			}
			asm.undo(oppoDisc, 0);

			moveSquare.push({move: emptySquare[i], score: score});

			// 評価値の高い順に並べ替える
			for (var j = moveSquare.length - 1; j > 0; j--) {
				if (moveSquare[j - 1].score >= moveSquare[j].score) continue;

				var tmp = moveSquare[j - 1];
				moveSquare[j - 1] = moveSquare[j];
				moveSquare[j] = tmp;
			}
		}
		if (moveSquare.length == 0) return;	// 通常あり得ないが念のため

		// 中盤以降の探索
		for (var i = 0; i < moveSquare.length; i++) {
			asm.flip(moveSquare[i].move, disc);

			var score, scoreCmp;
			if (depth == -2) {
				// 完全読み
				score = -asm.searchEndAlphaBeta(oppoDisc, empty - 1, -discDiff - (asm.getRC() - 1) * 2 - 1, 0,
					-64, scoreMax == null || scoreMax <= -64 ? 64 : -scoreMax + 1);	// 同一の最大評価値も対象とするため、正確な値となるよう+1する
				scoreCmp = score;
			} else if (depth == -1) {
				// 必勝読み
				score = -asm.searchEndAlphaBeta(oppoDisc, empty - 1, -discDiff - (asm.getRC() - 1) * 2 - 1, 0,
					-1, scoreMax == null || scoreMax <= -1 ? 1 : -scoreMax);	// 同一の最大評価値は対象外とするため、+1しない
				scoreCmp = score;
			} else {
				// 中盤読み
				score = -asm.searchMidAlphaBeta(oppoDisc, depth - 1, -discDiff - (asm.getRC() - 1) * 2 - 1, 0, -8064, 8064);

				if (score < 8000 && score > -8000) {
					scoreCmp = randScore(score, moveRand);
				} else {
					scoreCmp = score;
				}
			}

			asm.undo(oppoDisc, 0);

			if (move.length == 0 || scoreCmp > scoreMax) {
				// 最大評価値更新
				move.splice(0, move.length);
				move.push({move: moveSquare[i].move, score: score});
				scoreMax = scoreCmp;
				if (depth == -1 && scoreMax >= 1) break;	// α値β値の下限上限の関係が同一または逆転するならこれ以上探索する必要なし(その状態で探索すると異常に遅い)
			} else if (scoreCmp == scoreMax && depth != -1) {	// 必勝読みは石差損を減らすため、対象外とする
				// 最大評価値と同じ値は追加
				move.push({move: moveSquare[i].move, score: score});
			}
		}
	}

	// 結果を送信
	var rand = Math.floor(Math.random() * move.length);
	postMessage({
		move: move[rand].move,
		score: move[rand].score,	// 本当の評価値
		depth: depth
	});
}

// 定石探索
//   disc 手番の石の色
function searchBook(disc) {
	var bookCount = Math.floor(bookData.length / 5);

	// 0:下位32ビット、1:上位32ビット
	var black = [0, 0], white = [0, 0];

	// ビットボードの計算
	for (var i = 10; i < board.length; i++) {
		var square = i - 9 - Math.floor(i / 9);

		switch (board[i]) {
		case BLACK:
			if (square < 32) {
				black[0] |= 1 << square;
			} else {
				black[1] |= 1 << square - 32;
			}
			break;
		case WHITE:
			if (square < 32) {
				white[0] |= 1 << square;
			} else {
				white[1] |= 1 << square - 32;
			}
			break;
		}
	}

	// 対称形含む4つの盤面で探索する
	for (var i = 0; i < 4; i++) {
		switch (i) {
		case 1:
			// 初手e6
			mirrorA1h8(black);
			mirrorA1h8(white);
			break;
		case 2:
			// mirrorA1h8変換からの続きなので
			// 初手c4
			mirrorA8h1(black);
			mirrorA8h1(white);
			break;
		case 3:
			// mirrorA1h8とmirrorA8h1変換からの続きなので再度mirrorA1h8を行うとmirrorA8h1だけ行った状態になる
			// 初手d3
			mirrorA1h8(black);
			mirrorA1h8(white);
			break;
		default:
			// 初手f5
			break;
		}

		// 黒の上位32ビットを二分探索後、黒と白のそれぞれの64ビットで線形探索する
		var start = 0;
		var end = bookCount - 1;
		while (start <= end) {
			var mid = Math.floor((start + end) / 2);

			if (black[1] == bookData[mid * 5 + 1]) {
				// 検索した黒の盤面の先頭位置まで戻る
				while (mid > 0 && bookData[mid * 5 + 1] == bookData[(mid - 1) * 5 + 1]) mid--;

				while (mid < bookCount && black[1] == bookData[mid * 5 + 1]) {
					if (black[0] == bookData[mid * 5] &&
						white[0] == bookData[mid * 5 + 2] && white[1] == bookData[mid * 5 + 3]) {
						// 見つかった
						var bookInfo = bookData[mid * 5 + 4];

						var turn = bookInfo & 0xff;
						if (disc != turn) return false;

						// 見つかった盤面と手番が一致したのでその評価値を返す
						var score = bookInfo >> 8 & 0xff;
						if (score > 127) score -= 256;
						return -score;
					}
					mid++;
				}
				break;

			} else if (black[1] < bookData[mid * 5 + 1]) {
				end = mid - 1;

			} else {
				start = mid + 1;
			}
		}
	}

	return false;
}

// ビットボードa1h8軸反転
//   dest 結果格納先
function mirrorA1h8(dest) {
	var tmp1 = [], tmp2 = [];

	// tmp1 = (dest ^ dest >> 7) & 0x00aa00aa00aa00aa
	shiftBitRight(dest, tmp1, 7);
	tmp1[0] = (dest[0] ^ tmp1[0]) & 0x00aa00aa;
	tmp1[1] = (dest[1] ^ tmp1[1]) & 0x00aa00aa;
	// dest ^= tmp1 ^ tmp1 << 7
	shiftBitLeft(tmp1, tmp2, 7);
	dest[0] ^= tmp1[0] ^ tmp2[0];
	dest[1] ^= tmp1[1] ^ tmp2[1];

	// tmp1 = (dest ^ dest >> 14) & 0x0000cccc0000cccc
	shiftBitRight(dest, tmp1, 14);
	tmp1[0] = (dest[0] ^ tmp1[0]) & 0x0000cccc;
	tmp1[1] = (dest[1] ^ tmp1[1]) & 0x0000cccc;
	// dest ^= tmp1 ^ tmp1 << 14
	shiftBitLeft(tmp1, tmp2, 14);
	dest[0] ^= tmp1[0] ^ tmp2[0];
	dest[1] ^= tmp1[1] ^ tmp2[1];

	// tmp1 = (dest ^ dest >> 28) & 0x00000000f0f0f0f0
	shiftBitRight(dest, tmp1, 28);
	tmp1[0] = (dest[0] ^ tmp1[0]) & 0xf0f0f0f0;
	tmp1[1] = 0;
	// dest ^= tmp1 ^ tmp1 << 28
	shiftBitLeft(tmp1, tmp2, 28);
	dest[0] ^= tmp1[0] ^ tmp2[0];
	dest[1] ^= tmp1[1] ^ tmp2[1];
}

// ビットボードa8h1軸反転
//   dest 結果格納先
function mirrorA8h1(dest) {
	var tmp1 = [], tmp2 = [];

	// tmp1 = (dest ^ dest >> 9) & 0x0055005500550055
	shiftBitRight(dest, tmp1, 9);
	tmp1[0] = (dest[0] ^ tmp1[0]) & 0x00550055;
	tmp1[1] = (dest[1] ^ tmp1[1]) & 0x00550055;
	// dest ^= tmp1 ^ tmp1 << 9
	shiftBitLeft(tmp1, tmp2, 9);
	dest[0] ^= tmp1[0] ^ tmp2[0];
	dest[1] ^= tmp1[1] ^ tmp2[1];

	// tmp1 = (dest ^ dest >> 18) & 0x0000333300003333
	shiftBitRight(dest, tmp1, 18);
	tmp1[0] = (dest[0] ^ tmp1[0]) & 0x00003333;
	tmp1[1] = (dest[1] ^ tmp1[1]) & 0x00003333;
	// dest ^= tmp1 ^ tmp1 << 18
	shiftBitLeft(tmp1, tmp2, 18);
	dest[0] ^= tmp1[0] ^ tmp2[0];
	dest[1] ^= tmp1[1] ^ tmp2[1];

	// tmp1 = dest ^ dest >> 36
	shiftBitRight(dest, tmp1, 36);
	tmp1[0] ^= dest[0];
	tmp1[1] ^= dest[1];
	// dest ^= (tmp1 ^ dest << 36) & 0xf0f0f0f00f0f0f0f
	shiftBitLeft(dest, tmp2, 36);
	dest[0] ^= (tmp1[0] ^ tmp2[0]) & 0x0f0f0f0f;
	dest[1] ^= (tmp1[1] ^ tmp2[1]) & 0xf0f0f0f0;
}

// 64ビット左シフト(dest = src << shift)
//   src 値
//   dest 結果格納先
//   shift シフトするビット数
function shiftBitLeft(src, dest, shift) {
	var mask = -(shift >>> 5);
	dest[1] = (src[1] << shift | src[0] >>> 32 - shift) & ~mask | (src[0] << shift - 32 & mask);
	dest[0] = src[0] << shift & ~mask;
}

// 64ビット右シフト(dest = src >>> shift)
//   src 値
//   dest 結果格納先
//   shift シフトするビット数
function shiftBitRight(src, dest, shift) {
	var mask = -(shift >>> 5);
	dest[0] = (src[0] >>> shift | src[1] << 32 - shift) & ~mask | (src[1] >>> shift - 32 & mask);
	dest[1] = src[1] >>> shift & ~mask;
}

// 評価値を調子用にランダムで変動させる。rand大きくなるほど調子が悪くなる
//   score 評価値
//   rand ランダム幅
function randScore(score, rand) {
	if (Math.floor(Math.random() * 1000) < rand) {
		// 評価値の符号を反転させることで悪手を優先させる
		return -score;
	}

	var randHalf = Math.floor(rand / 2);

	// 調子が悪くなりすぎないよう、scoreとrandの差がrandHalf未満、つまりscoreが-randHalfを下回る場合は
	// その差をrandにすることで、ランダムで-randを下回るscoreにならないようにする
	// scoreとrandの差が0未満、つまりscoreが-randを下回る場合はrandを0にして調子用数値を実質無効にする
	randHalf = Math.max(Math.min(score + randHalf * 2, randHalf), 0);

	return score + (Math.floor(Math.random() * randHalf * 2) - randHalf);
}

const asm = function (stdlib, foreign, heap) {
	"use asm";

	var heapU8 = new stdlib.Uint8Array(heap);
	var heapI8 = new stdlib.Int8Array(heap);
	var empty = 0;	// 空所数
	var recordCount = 0;
	var depthStart = 0;	// 読み手数
	var stage = 0; // 局面の段階

	function init(_empty, _depthStart, _stage) {
		_empty = _empty | 0;
		_depthStart = _depthStart | 0;
		_stage = _stage | 0;

		empty = _empty;
		depthStart = _depthStart;
		stage = _stage;
	}
	function initRC() {
		recordCount = 0;
	}
	function getRC() {
		return recordCount | 0;
	}

	// 中盤のnega-αβ法による探索
	//   disc 手番の石の色
	//   depth 読み手数
	//   discDiff 石差
	//   pass パスしているならtrue
	//   alpha α値
	//   beta β値
	function searchMidAlphaBeta(disc, depth, discDiff, pass, alpha, beta) {
		disc = disc | 0;
		depth = depth | 0;
		discDiff = discDiff | 0;
		pass = pass | 0;
		alpha = alpha | 0;
		beta = beta | 0;
		var oppoDisc = 0;
		var score = 0;
		var toCount = 0;
		var i = 0;

		if ((discDiff + empty - depthStart + depth | 0) >= 64) return 8064;
		if ((discDiff - empty + depthStart - depth | 0) <= -64) return -8064;
		if ((depth | 0) <= 0) return getScore(disc) | 0;

		oppoDisc = 1 - disc | 0;
		score = -9000;
		toCount = recordCount;

		for (; (i | 0) < (empty | 0); i = i + 1 | 0) {
			if (!(flip(heapU8[91 + i | 0] | 0, disc | 0) | 0)) continue;

			score = -(searchMidAlphaBeta(
				oppoDisc,
				depth - 1 | 0,
				(-discDiff | 0) - ((recordCount - toCount - 1) << 1 | 0) - 1 | 0,
				0,
				-beta | 0,
				-alpha | 0
			) | 0) | 0;

			undo(oppoDisc, toCount);

			if ((score | 0) > (alpha | 0)) {
				alpha = score;
				if ((alpha | 0) >= (beta | 0)) return alpha | 0;
			}
		}

		if ((score | 0) != -9000) return alpha | 0;
		if (pass) {
			if ((discDiff | 0) > 0) return discDiff + empty - depthStart + depth + 8000 | 0;
			if ((discDiff | 0) < 0) return discDiff - empty + depthStart - depth - 8000 | 0;
			return 0;
		}
		return -(searchMidAlphaBeta(oppoDisc, depth, -discDiff | 0, 1, -beta | 0, -alpha | 0) | 0) | 0;
	}

	// 終盤のnega-αβ法による探索
	//   disc 手番の石の色
	//   depth 読み手数
	//   discDiff 石差
	//   pass パスしているならtrue
	//   alpha α値
	//   beta β値
	function searchEndAlphaBeta(disc, depth, discDiff, pass, alpha, beta) {
		disc = disc | 0;
		depth = depth | 0;
		discDiff = discDiff | 0;
		pass = pass | 0;
		alpha = alpha | 0;
		beta = beta | 0;
		var oppoDisc = 0;
		var score = 0;
		var toCount = 0;
		var i = 0;

		if ((depth | 0) <= 0) return discDiff | 0;

		oppoDisc = 1 - disc | 0;
		score = -9000;
		toCount = recordCount;

		for (; (i | 0) < (empty | 0); i = i + 1 | 0) {
			if (!(flip(heapU8[91 + i | 0] | 0, disc | 0) | 0)) continue;

			score = -(searchEndAlphaBeta(
				oppoDisc,
				depth - 1 | 0,
				(-discDiff | 0) - ((recordCount - toCount - 1) << 1 | 0) - 1 | 0,
				0,
				-beta | 0,
				-alpha | 0
			) | 0) | 0;

			undo(oppoDisc, toCount);

			if ((score | 0) > (alpha | 0)) {
				alpha = score;
				if ((alpha | 0) >= (beta | 0)) return alpha | 0;
			}
		}

		if ((score | 0) != -9000) return alpha | 0;
		if (pass) {
			if ((discDiff | 0) > 0) return discDiff + depth | 0;
			if ((discDiff | 0) < 0) return discDiff - depth | 0;
			return 0;
		}
		return -(searchEndAlphaBeta(oppoDisc, depth, -discDiff | 0, 1, -beta | 0, -alpha | 0) | 0) | 0;
	}

	// 指定した箇所に打つ
	//   square 箇所
	//   disc 手番の石の色
	function flip(square, disc) {
		square = square | 0;
		disc = disc | 0;
		var oppoDisc = 0;

		if ((heapU8[square] | 0) != 2/* EMPTY */) return 0;

		// 相手の石の色
		oppoDisc = 1 - disc | 0;

		if (
			(flipDirection(square, disc, oppoDisc, -9) | 0) |	// 上
			(flipDirection(square, disc, oppoDisc, -8) | 0) |	// 右上
			(flipDirection(square, disc, oppoDisc, 1) | 0) |	// 右
			(flipDirection(square, disc, oppoDisc, 10) | 0) |	// 右下
			(flipDirection(square, disc, oppoDisc, 9) | 0) |	// 下
			(flipDirection(square, disc, oppoDisc, 8) | 0) |	// 左下
			(flipDirection(square, disc, oppoDisc, -1) | 0) |	// 左
			(flipDirection(square, disc, oppoDisc, -10) | 0)	// 左上
		) {
			heapU8[square] = disc;
			heapU8[155 + recordCount | 0] = square;
			recordCount = recordCount + 1 | 0;
			return 1;
		}

		return 0;
	}

	// 指定した箇所と方向で打つ
	//   square 箇所
	//   disc 手番の石の色
	//   oppoDisc 相手の石の色
	//   direction 方向
	function flipDirection(square, disc, oppoDisc, direction) {
		square = square | 0;
		disc = disc | 0;
		oppoDisc = oppoDisc | 0;
		direction = direction | 0;
		var oppoFlag = 0;

		for (;;) {
			square = square + direction | 0;

			// 自分の石、または空所ならループを抜ける
			if ((heapU8[square] | 0) != (oppoDisc | 0)) break;

			oppoFlag = 1;
		}

		if (!oppoFlag) return 0;
		if ((heapU8[square] | 0) != (disc | 0)) return 0;

		// 打てるので、相手の石を自分の石に変える
		for (;;) {
			square = square - direction | 0;
			if ((heapU8[square] | 0) != (oppoDisc | 0)) break;
			heapU8[square] = disc;
			heapU8[155 + recordCount | 0] = square;
			recordCount = recordCount + 1 | 0;
		}

		return 1;
	}

	// 打った石を戻す
	//   disc 手番の石の色
	//   toCount どこまで戻すか
	function undo(disc, toCount) {
		disc = disc | 0;
		toCount = toCount | 0;
		recordCount = recordCount - 1 | 0;
		heapU8[heapU8[155 + recordCount | 0] | 0] = 2/* EMPTY */;

		for (;;) {
			recordCount = recordCount - 1 | 0;
			heapU8[heapU8[155 + recordCount | 0] | 0] = disc;
			if ((recordCount | 0) <= (toCount | 0)) break;
		}
	}

	// 評価関数
	//   disc 手番の石の色
	function getScore(disc) {
		disc = disc | 0;
		var score = 0;
		var offset = 0;

		// diag4
		offset = 1155 + (81 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[13] | 0) + ((heapU8[21] | 0) * 3 | 0) + ((heapU8[29] | 0) * 9 | 0) + ((heapU8[37] | 0) * 27 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[53] | 0) + ((heapU8[61] | 0) * 3 | 0) + ((heapU8[69] | 0) * 9 | 0) + ((heapU8[77] | 0) * 27 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[14] | 0) + ((heapU8[24] | 0) * 3 | 0) + ((heapU8[34] | 0) * 9 | 0) + ((heapU8[44] | 0) * 27 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[46] | 0) + ((heapU8[56] | 0) * 3 | 0) + ((heapU8[66] | 0) * 9 | 0) + ((heapU8[76] | 0) * 27 | 0) | 0] | 0) | 0;

		// diag5
		offset = 1155 + (81 * 13 | 0) + (243 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[14] | 0) + ((heapU8[22] | 0) * 3 | 0) + ((heapU8[30] | 0) * 9 | 0) + ((heapU8[38] | 0) * 27 | 0) + ((heapU8[46] | 0) * 81 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[44] | 0) + ((heapU8[52] | 0) * 3 | 0) + ((heapU8[60] | 0) * 9 | 0) + ((heapU8[68] | 0) * 27 | 0) + ((heapU8[76] | 0) * 81 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[13] | 0) + ((heapU8[23] | 0) * 3 | 0) + ((heapU8[33] | 0) * 9 | 0) + ((heapU8[43] | 0) * 27 | 0) + ((heapU8[53] | 0) * 81 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[37] | 0) + ((heapU8[47] | 0) * 3 | 0) + ((heapU8[57] | 0) * 9 | 0) + ((heapU8[67] | 0) * 27 | 0) + ((heapU8[77] | 0) * 81 | 0) | 0] | 0) | 0;

		// diag6
		offset = 1155 + (81 * 13 | 0) + (243 * 13 | 0) + (729 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[15] | 0) + ((heapU8[23] | 0) * 3 | 0) + ((heapU8[31] | 0) * 9 | 0) + ((heapU8[39] | 0) * 27 | 0) + ((heapU8[47] | 0) * 81 | 0) + ((heapU8[55] | 0) * 243 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[35] | 0) + ((heapU8[43] | 0) * 3 | 0) + ((heapU8[51] | 0) * 9 | 0) + ((heapU8[59] | 0) * 27 | 0) + ((heapU8[67] | 0) * 81 | 0) + ((heapU8[75] | 0) * 243 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[12] | 0) + ((heapU8[22] | 0) * 3 | 0) + ((heapU8[32] | 0) * 9 | 0) + ((heapU8[42] | 0) * 27 | 0) + ((heapU8[52] | 0) * 81 | 0) + ((heapU8[62] | 0) * 243 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[28] | 0) + ((heapU8[38] | 0) * 3 | 0) + ((heapU8[48] | 0) * 9 | 0) + ((heapU8[58] | 0) * 27 | 0) + ((heapU8[68] | 0) * 81 | 0) + ((heapU8[78] | 0) * 243 | 0) | 0] | 0) | 0;

		// diag7
		offset = 1155 + (81 * 13 | 0) + (243 * 13 | 0) + (729 * 13 | 0) + (2187 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[16] | 0) + ((heapU8[24] | 0) * 3 | 0) + ((heapU8[32] | 0) * 9 | 0) + ((heapU8[40] | 0) * 27 | 0) + ((heapU8[48] | 0) * 81 | 0) + ((heapU8[56] | 0) * 243 | 0) + ((heapU8[64] | 0) * 729 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[26] | 0) + ((heapU8[34] | 0) * 3 | 0) + ((heapU8[42] | 0) * 9 | 0) + ((heapU8[50] | 0) * 27 | 0) + ((heapU8[58] | 0) * 81 | 0) + ((heapU8[66] | 0) * 243 | 0) + ((heapU8[74] | 0) * 729 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[11] | 0) + ((heapU8[21] | 0) * 3 | 0) + ((heapU8[31] | 0) * 9 | 0) + ((heapU8[41] | 0) * 27 | 0) + ((heapU8[51] | 0) * 81 | 0) + ((heapU8[61] | 0) * 243 | 0) + ((heapU8[71] | 0) * 729 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[19] | 0) + ((heapU8[29] | 0) * 3 | 0) + ((heapU8[39] | 0) * 9 | 0) + ((heapU8[49] | 0) * 27 | 0) + ((heapU8[59] | 0) * 81 | 0) + ((heapU8[69] | 0) * 243 | 0) + ((heapU8[79] | 0) * 729 | 0) | 0] | 0) | 0;

		// diag8
		offset = 1155 + (81 * 13 | 0) + (243 * 13 | 0) + (729 * 13 | 0) + (2187 * 13 | 0) + (6561 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[17] | 0) + ((heapU8[25] | 0) * 3 | 0) + ((heapU8[33] | 0) * 9 | 0) + ((heapU8[41] | 0) * 27 | 0) + ((heapU8[49] | 0) * 81 | 0) + ((heapU8[57] | 0) * 243 | 0) + ((heapU8[65] | 0) * 729 | 0) + ((heapU8[73] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[10] | 0) + ((heapU8[20] | 0) * 3 | 0) + ((heapU8[30] | 0) * 9 | 0) + ((heapU8[40] | 0) * 27 | 0) + ((heapU8[50] | 0) * 81 | 0) + ((heapU8[60] | 0) * 243 | 0) + ((heapU8[70] | 0) * 729 | 0) + ((heapU8[80] | 0) * 2187 | 0) | 0] | 0) | 0;

		// hor/vert2
		offset = 1155 + (81 * 13 | 0) + (243 * 13 | 0) + (729 * 13 | 0) + (2187 * 13 | 0) + (6561 * 13 | 0) + (6561 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[19] | 0) + ((heapU8[20] | 0) * 3 | 0) + ((heapU8[21] | 0) * 9 | 0) + ((heapU8[22] | 0) * 27 | 0) + ((heapU8[23] | 0) * 81 | 0) + ((heapU8[24] | 0) * 243 | 0) + ((heapU8[25] | 0) * 729 | 0) + ((heapU8[26] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[64] | 0) + ((heapU8[65] | 0) * 3 | 0) + ((heapU8[66] | 0) * 9 | 0) + ((heapU8[67] | 0) * 27 | 0) + ((heapU8[68] | 0) * 81 | 0) + ((heapU8[69] | 0) * 243 | 0) + ((heapU8[70] | 0) * 729 | 0) + ((heapU8[71] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[11] | 0) + ((heapU8[20] | 0) * 3 | 0) + ((heapU8[29] | 0) * 9 | 0) + ((heapU8[38] | 0) * 27 | 0) + ((heapU8[47] | 0) * 81 | 0) + ((heapU8[56] | 0) * 243 | 0) + ((heapU8[65] | 0) * 729 | 0) + ((heapU8[74] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[16] | 0) + ((heapU8[25] | 0) * 3 | 0) + ((heapU8[34] | 0) * 9 | 0) + ((heapU8[43] | 0) * 27 | 0) + ((heapU8[52] | 0) * 81 | 0) + ((heapU8[61] | 0) * 243 | 0) + ((heapU8[70] | 0) * 729 | 0) + ((heapU8[79] | 0) * 2187 | 0) | 0] | 0) | 0;

		// hor/vert3
		offset = 1155 + (81 * 13 | 0) + (243 * 13 | 0) + (729 * 13 | 0) + (2187 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (6561 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[28] | 0) + ((heapU8[29] | 0) * 3 | 0) + ((heapU8[30] | 0) * 9 | 0) + ((heapU8[31] | 0) * 27 | 0) + ((heapU8[32] | 0) * 81 | 0) + ((heapU8[33] | 0) * 243 | 0) + ((heapU8[34] | 0) * 729 | 0) + ((heapU8[35] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[55] | 0) + ((heapU8[56] | 0) * 3 | 0) + ((heapU8[57] | 0) * 9 | 0) + ((heapU8[58] | 0) * 27 | 0) + ((heapU8[59] | 0) * 81 | 0) + ((heapU8[60] | 0) * 243 | 0) + ((heapU8[61] | 0) * 729 | 0) + ((heapU8[62] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[12] | 0) + ((heapU8[21] | 0) * 3 | 0) + ((heapU8[30] | 0) * 9 | 0) + ((heapU8[39] | 0) * 27 | 0) + ((heapU8[48] | 0) * 81 | 0) + ((heapU8[57] | 0) * 243 | 0) + ((heapU8[66] | 0) * 729 | 0) + ((heapU8[75] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[15] | 0) + ((heapU8[24] | 0) * 3 | 0) + ((heapU8[33] | 0) * 9 | 0) + ((heapU8[42] | 0) * 27 | 0) + ((heapU8[51] | 0) * 81 | 0) + ((heapU8[60] | 0) * 243 | 0) + ((heapU8[69] | 0) * 729 | 0) + ((heapU8[78] | 0) * 2187 | 0) | 0] | 0) | 0;

		// hor/vert4
		offset = 1155 + (81 * 13 | 0) + (243 * 13 | 0) + (729 * 13 | 0) + (2187 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (6561 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[37] | 0) + ((heapU8[38] | 0) * 3 | 0) + ((heapU8[39] | 0) * 9 | 0) + ((heapU8[40] | 0) * 27 | 0) + ((heapU8[41] | 0) * 81 | 0) + ((heapU8[42] | 0) * 243 | 0) + ((heapU8[43] | 0) * 729 | 0) + ((heapU8[44] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[46] | 0) + ((heapU8[47] | 0) * 3 | 0) + ((heapU8[48] | 0) * 9 | 0) + ((heapU8[49] | 0) * 27 | 0) + ((heapU8[50] | 0) * 81 | 0) + ((heapU8[51] | 0) * 243 | 0) + ((heapU8[52] | 0) * 729 | 0) + ((heapU8[53] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[13] | 0) + ((heapU8[22] | 0) * 3 | 0) + ((heapU8[31] | 0) * 9 | 0) + ((heapU8[40] | 0) * 27 | 0) + ((heapU8[49] | 0) * 81 | 0) + ((heapU8[58] | 0) * 243 | 0) + ((heapU8[67] | 0) * 729 | 0) + ((heapU8[76] | 0) * 2187 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[14] | 0) + ((heapU8[23] | 0) * 3 | 0) + ((heapU8[32] | 0) * 9 | 0) + ((heapU8[41] | 0) * 27 | 0) + ((heapU8[50] | 0) * 81 | 0) + ((heapU8[59] | 0) * 243 | 0) + ((heapU8[68] | 0) * 729 | 0) + ((heapU8[77] | 0) * 2187 | 0) | 0] | 0) | 0;

		// edge+2x
		offset = 1155 + (81 * 13 | 0) + (243 * 13 | 0) + (729 * 13 | 0) + (2187 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (59049 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[10] | 0) + ((heapU8[11] | 0) * 3 | 0) + ((heapU8[12] | 0) * 9 | 0) + ((heapU8[13] | 0) * 27 | 0) + ((heapU8[14] | 0) * 81 | 0) + ((heapU8[15] | 0) * 243 | 0) + ((heapU8[16] | 0) * 729 | 0) + ((heapU8[17] | 0) * 2187 | 0) + ((heapU8[20] | 0) * 6561 | 0) + ((heapU8[25] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[17] | 0) + ((heapU8[26] | 0) * 3 | 0) + ((heapU8[35] | 0) * 9 | 0) + ((heapU8[44] | 0) * 27 | 0) + ((heapU8[53] | 0) * 81 | 0) + ((heapU8[62] | 0) * 243 | 0) + ((heapU8[71] | 0) * 729 | 0) + ((heapU8[80] | 0) * 2187 | 0) + ((heapU8[25] | 0) * 6561 | 0) + ((heapU8[70] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[73] | 0) + ((heapU8[64] | 0) * 3 | 0) + ((heapU8[55] | 0) * 9 | 0) + ((heapU8[46] | 0) * 27 | 0) + ((heapU8[37] | 0) * 81 | 0) + ((heapU8[28] | 0) * 243 | 0) + ((heapU8[19] | 0) * 729 | 0) + ((heapU8[10] | 0) * 2187 | 0) + ((heapU8[65] | 0) * 6561 | 0) + ((heapU8[20] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[80] | 0) + ((heapU8[79] | 0) * 3 | 0) + ((heapU8[78] | 0) * 9 | 0) + ((heapU8[77] | 0) * 27 | 0) + ((heapU8[76] | 0) * 81 | 0) + ((heapU8[75] | 0) * 243 | 0) + ((heapU8[74] | 0) * 729 | 0) + ((heapU8[73] | 0) * 2187 | 0) + ((heapU8[70] | 0) * 6561 | 0) + ((heapU8[65] | 0) * 19683 | 0) | 0] | 0) | 0;

		// corner3x3
		offset = 1155 + (81 * 13 | 0) + (243 * 13 | 0) + (729 * 13 | 0) + (2187 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (59049 * 13 | 0) + (19683 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[10] | 0) + ((heapU8[11] | 0) * 3 | 0) + ((heapU8[12] | 0) * 9 | 0) + ((heapU8[19] | 0) * 27 | 0) + ((heapU8[20] | 0) * 81 | 0) + ((heapU8[21] | 0) * 243 | 0) + ((heapU8[28] | 0) * 729 | 0) + ((heapU8[29] | 0) * 2187 | 0) + ((heapU8[30] | 0) * 6561 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[17] | 0) + ((heapU8[16] | 0) * 3 | 0) + ((heapU8[15] | 0) * 9 | 0) + ((heapU8[26] | 0) * 27 | 0) + ((heapU8[25] | 0) * 81 | 0) + ((heapU8[24] | 0) * 243 | 0) + ((heapU8[35] | 0) * 729 | 0) + ((heapU8[34] | 0) * 2187 | 0) + ((heapU8[33] | 0) * 6561 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[73] | 0) + ((heapU8[74] | 0) * 3 | 0) + ((heapU8[75] | 0) * 9 | 0) + ((heapU8[64] | 0) * 27 | 0) + ((heapU8[65] | 0) * 81 | 0) + ((heapU8[66] | 0) * 243 | 0) + ((heapU8[55] | 0) * 729 | 0) + ((heapU8[56] | 0) * 2187 | 0) + ((heapU8[57] | 0) * 6561 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[80] | 0) + ((heapU8[79] | 0) * 3 | 0) + ((heapU8[78] | 0) * 9 | 0) + ((heapU8[71] | 0) * 27 | 0) + ((heapU8[70] | 0) * 81 | 0) + ((heapU8[69] | 0) * 243 | 0) + ((heapU8[62] | 0) * 729 | 0) + ((heapU8[61] | 0) * 2187 | 0) + ((heapU8[60] | 0) * 6561 | 0) | 0] | 0) | 0;

		// corner2x5
		offset = 1155 + (81 * 13 | 0) + (243 * 13 | 0) + (729 * 13 | 0) + (2187 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (6561 * 13 | 0) + (59049 * 13 | 0) + (19683 * 13 | 0) + (59049 * stage | 0) | 0;
		score = score + (heapI8[offset + (heapU8[10] | 0) + ((heapU8[11] | 0) * 3 | 0) + ((heapU8[12] | 0) * 9 | 0) + ((heapU8[13] | 0) * 27 | 0) + ((heapU8[14] | 0) * 81 | 0) + ((heapU8[19] | 0) * 243 | 0) + ((heapU8[20] | 0) * 729 | 0) + ((heapU8[21] | 0) * 2187 | 0) + ((heapU8[22] | 0) * 6561 | 0) + ((heapU8[23] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[10] | 0) + ((heapU8[19] | 0) * 3 | 0) + ((heapU8[28] | 0) * 9 | 0) + ((heapU8[37] | 0) * 27 | 0) + ((heapU8[46] | 0) * 81 | 0) + ((heapU8[11] | 0) * 243 | 0) + ((heapU8[20] | 0) * 729 | 0) + ((heapU8[29] | 0) * 2187 | 0) + ((heapU8[38] | 0) * 6561 | 0) + ((heapU8[47] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[17] | 0) + ((heapU8[16] | 0) * 3 | 0) + ((heapU8[15] | 0) * 9 | 0) + ((heapU8[14] | 0) * 27 | 0) + ((heapU8[13] | 0) * 81 | 0) + ((heapU8[26] | 0) * 243 | 0) + ((heapU8[25] | 0) * 729 | 0) + ((heapU8[24] | 0) * 2187 | 0) + ((heapU8[23] | 0) * 6561 | 0) + ((heapU8[22] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[17] | 0) + ((heapU8[26] | 0) * 3 | 0) + ((heapU8[35] | 0) * 9 | 0) + ((heapU8[44] | 0) * 27 | 0) + ((heapU8[53] | 0) * 81 | 0) + ((heapU8[16] | 0) * 243 | 0) + ((heapU8[25] | 0) * 729 | 0) + ((heapU8[34] | 0) * 2187 | 0) + ((heapU8[43] | 0) * 6561 | 0) + ((heapU8[52] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[73] | 0) + ((heapU8[74] | 0) * 3 | 0) + ((heapU8[75] | 0) * 9 | 0) + ((heapU8[76] | 0) * 27 | 0) + ((heapU8[77] | 0) * 81 | 0) + ((heapU8[64] | 0) * 243 | 0) + ((heapU8[65] | 0) * 729 | 0) + ((heapU8[66] | 0) * 2187 | 0) + ((heapU8[67] | 0) * 6561 | 0) + ((heapU8[68] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[73] | 0) + ((heapU8[64] | 0) * 3 | 0) + ((heapU8[55] | 0) * 9 | 0) + ((heapU8[46] | 0) * 27 | 0) + ((heapU8[37] | 0) * 81 | 0) + ((heapU8[74] | 0) * 243 | 0) + ((heapU8[65] | 0) * 729 | 0) + ((heapU8[56] | 0) * 2187 | 0) + ((heapU8[47] | 0) * 6561 | 0) + ((heapU8[38] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[80] | 0) + ((heapU8[79] | 0) * 3 | 0) + ((heapU8[78] | 0) * 9 | 0) + ((heapU8[77] | 0) * 27 | 0) + ((heapU8[76] | 0) * 81 | 0) + ((heapU8[71] | 0) * 243 | 0) + ((heapU8[70] | 0) * 729 | 0) + ((heapU8[69] | 0) * 2187 | 0) + ((heapU8[68] | 0) * 6561 | 0) + ((heapU8[67] | 0) * 19683 | 0) | 0] | 0) | 0;
		score = score + (heapI8[offset + (heapU8[80] | 0) + ((heapU8[71] | 0) * 3 | 0) + ((heapU8[62] | 0) * 9 | 0) + ((heapU8[53] | 0) * 27 | 0) + ((heapU8[44] | 0) * 81 | 0) + ((heapU8[79] | 0) * 243 | 0) + ((heapU8[70] | 0) * 729 | 0) + ((heapU8[61] | 0) * 2187 | 0) + ((heapU8[52] | 0) * 6561 | 0) + ((heapU8[43] | 0) * 19683 | 0) | 0] | 0) | 0;

		if ((disc | 0) == 0/* BLACK */) return score | 0;
		return -score | 0;
	}

	return {
		init: init,
		initRC: initRC,
		getRC: getRC,
		searchMidAlphaBeta: searchMidAlphaBeta,
		searchEndAlphaBeta: searchEndAlphaBeta,
		flip: flip,
		undo: undo
	};
}(self, null, heap);
