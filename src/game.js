//
// 進行
//
const Game = new function () {
	var eventFlag = false;	// 盤面押下イベント受け付けフラグ
	var explainMode = 0;	// 解説モード
	var comMessage;

	var repeatExplain1 = 0, repeatExplain2 = 0;

	this.create = create;
	this.startMessage = startMessage;

	// 作成
	function create() {
		Board.createBoard();

		// 盤面押下時
		Board.click = function (square) {
			if (!eventFlag) return;
			Queue.clear();

			var flippable = Rule.canFlip(square);

			if (flippable && (explainMode == 0 || Rule.markSquare.length == 0 || Rule.markSquare.indexOf(square) != -1)) {
				// 打てる(またはそう見なす)箇所だった
				eventFlag = false;
				Rule.flip(square);
				if (explainMode == 0) {
					nextTurn();
				} else {
					explain(square);
				}

			} else {
				// 打てない(またはそう見なす)箇所だった
				if (Com.getYsw() < 3) {
					if (explainMode == 0) {
						var message = Com.getCantFlipMessage(Board.getDisc(square) == Board.EMPTY ? 0 : 1);
						Queue.message(message);
						Queue.interval(500 + message.length * 100);
						Queue.message(Com.getCantFlipMessage(2));
					} else {
						if (flippable) {
							Queue.message("そこは打てるけど、今は従ってくれ。");
						} else {
							Queue.message("そこは無理だぞ。");
						}
					}
				}

				Rule.animCantFlip(square, flippable);
			}
		};

		// キャラ部分押下時
		$("#messageContainer").click(function () {
			if (!eventFlag || explainMode != 0) return;
			eventFlag = false;
			Rule.hideCanFlip();
			Queue.clear(true);

			if (Com.getYsw() >= 3) {
				Queue.dialog({
					button: ["戻す", "リセット", "何もしない"],
					callback: function (button) {
						if (button == 0) {
							eventFlag = true;
							Rule.showCanFlip();
							return;
						}

						Queue.dialog();
						switch (button) {
						case 1:	// 戻す
							if (Rule.getTurn().move > 0) {
								undo();
							} else {
								resetDialog();
							}
							break;
						case 2:	// リセット
							resetDialog();
							break;
						case 3:	// 何もしない
							eventFlag = true;
							Rule.showCanFlip();
							break;
						}
					},
					closeable: true
				});
				return;
			}

			// コンピュータのレベル表示
			var level = Com.getLevel();
			var message = "強さ：" + (level == 1 ? "手加減" : (level == 2 ? "いつもどおり" : (level == 3 ? "本気" : "ドーピング"))) + "<br />調子：";
			if (Com.getYsw() > 0) {
				if (Com.getRand0Cnt() > 0) {
					message += "ドーピング";
				} else if (Com.getRand0Cnt() < 0) {
					message += "最悪";
				} else {
					var moveRand = Com.getMoveRand();
					if (moveRand < 300) {
						message += "良い";
					} else if (moveRand < 400) {
						message += "普通";
					} else if (moveRand < 500) {
						message += "いまいち";
					} else {
						message += "悪い";
					}
				}
			} else {
				message += "？";
			}

			Queue.dialog({
				message: message,
				button: ["待った！", "始めからやり直したい", "何も言わない"],
				callback: function (button) {
					if (button == 0) {
						eventFlag = true;
						Rule.showCanFlip();
						return;
					}

					Queue.dialog();
					switch (button) {
					case 1:	// 待った！
						if (Rule.getTurn().move > 1) {
							// プレイヤーの手番まで戻す
							Queue.message(Com.getUndoMessage(0));
							undo();

						} else {
							// プレイヤーの初手なので始めからやり直す場合とほぼ同じにする
							Queue.message(Com.getUndoMessage(1));
							Queue.dialog({
								button: ["はい", "いいえ"],
								callback: function (button) {
									Queue.dialog();

									switch (button) {
									case 1:	// はい
										startMessage("ふぅ…。さて、");
										break;
									case 2:	// いいえ
										Queue.message(Com.getUndoMessage(3));
										eventFlag = true;
										Rule.showCanFlip();
										break;
									}
								},
							});
						}
						break;

					case 2:	// 始めからやり直したい
						Queue.message(Com.getUndoMessage(2));
						Queue.dialog({
							button: ["はい", "やっぱ、いい"],
							callback: function (button) {
								Queue.dialog();

								switch (button) {
								case 1:	// はい
									startMessage("ふぅ…。さて、");
									break;
								case 2:	// やっぱ、いい
									Queue.message(Com.getUndoMessage(3));
									eventFlag = true;
									Rule.showCanFlip();
									break;
								}
							},
						});
						break;

					case 3:	// 何も言わない
						eventFlag = true;
						Rule.showCanFlip();
						break;
					}
				},
				closeable: true
			});

			function resetDialog() {
				Queue.dialog({
					message: "リセットしますか？",
					button: ["はい", "いいえ"],
					callback: function (button) {
						Queue.dialog();

						switch (button) {
						case 1:	// はい
							Main.init(200, 300);
							break;
						case 2:	// いいえ
							eventFlag = true;
							Rule.showCanFlip();
							break;
						}
					},
				});
			}
		});
	}

	// 対局開始前
	//   pre テキストの最初に表示する文言
	//   firstFlag 初回の場合にtrueを指定する
	function startMessage(pre, firstFlag) {
		Rule.init();
		if (Com.getYsw() >= 3) {
			nextTurn();
			return;
		}
		comMessage = Com.getPlayerTurnMessage();
		if (firstFlag) repeatExplain1 = repeatExplain2 = 0;

		if (Com.getRand0Cnt() >= 2) {
			if (Com.getLevel() >= 4) Com.setLevel(3);
			Com.setRand0Cnt(-8);
			pre = "ふぅ‥‥。なんだか調子悪いが、";
		} else if (Com.getRand0Cnt() == -1) {
			Com.setRand0Cnt(0);
			pre = "ふぅ、やっと調子が戻ったか…。<br />";
		} else if (Com.getRand0Cnt() != 0) {
			Com.setRand0Cnt(Com.getRand0Cnt() + 1);
		}

		Queue.message((pre || "") + "お前は先手・後手どっちにするんだ？");
		Queue.dialog({
			button: [
				"先手(黒)",
				"後手(白)",
				"お前が決めろ",
				Com.getYsw() > 0 || repeatExplain2 >= 3 ? null : "その前にオセロを教えろ"
			],
			callback: function (button) {
				switch (button) {
				case 1:	// 先手(黒)
					Com.setDisc(Board.WHITE);	// コンピューターは白
					ready();
					break;
				case 2:	// 後手(白)
					Com.setDisc(Board.BLACK);	// コンピューターは黒
					ready();
					break;
				case 3:	// お前が決めろ
					Com.setDisc(Math.random() < 0.5 ? Board.BLACK : Board.WHITE);
					ready();
					break;
				case 4:	// その前にオセロを教えろ
					Queue.dialog();
					if (repeatExplain1 < 1) {
						if (repeatExplain2 < 1) {
							Queue.message("俺に教えを乞うのか。最後まで聞く気はあるんだろうな？");
						} else {
							Queue.message("どっちなのかはっきりしろ！ 最後まで聞くか？");
						}
					} else {
						Queue.message("また聞くのか？ 途中でやめるは無しだぞ？");
					}
					Queue.dialog({
						button: ["ＯＫ", "じゃあ、やめる"],
						callback: function (button) {
							Queue.dialog();

							switch (button) {
							case 1:	// ＯＫ
								repeatExplain1++;
								explain();
								break;
							case 2:	// じゃあ、やめる
								repeatExplain2++;
								if (repeatExplain2 < 3) {
									startMessage("ならもっかい聞くぞ。<br />");
								} else {
									startMessage("もういい。<br />");
								}
								break;
							}
						}
					});
					break;
				}
			}
		});

		var repeatReady = 0;

		function ready(pre) {
			repeatExplain2 = 0;
			Queue.dialog();

			if (Com.getDisc() == Board.BLACK) {
				Queue.message((pre || "") + "お前が後手(白)、俺が先手(黒)ね。<br />じゃあ、俺から打つぜ。準備はOK？");
			} else {
				Queue.message((pre || "") + "お前が先手(黒)、俺が後手(白)ね。<br />じゃあ、対局だ。準備はOK？");
			}

			Queue.dialog({
				message: "準備はOK？",
				button: ["OK", "待て"],
				callback: function (button) {
					switch (button) {
					case 1:	// OK
						Queue.dialog();
						nextTurn();
						break;

					case 2:	// 待て
						if (repeatReady < 3) {
							Queue.dialog();
							switch (repeatReady) {
							case 0:
								Queue.message("なんだ？");
								break;
							case 1:
								Queue.message("どれくらいにしてほしい？<br />ったく、とっとと決めて、はやく対局しようぜ。");
								break;
							default:
								Queue.message("なんだよ、しつこいぞ。");
								break;
							}
							Queue.dialog({
								button: ["手加減しろ", "いつもどおり打て", "本気で打て", Com.getYsw() > 0 ? "真の本気とやらを見せろ" : null],
								callback: function (button) {
									switch (button) {
									case 1:	// 手加減しろ
										Com.setLevel(1);
										ready("ちっ、わかったよ。<br />");
										break;
									case 2:	// いつもどおり打て
										Com.setLevel(2);
										ready("OK、いいぜ。<br />");
										break;
									case 3:	// 本気で打て
										Com.setLevel(3);
										ready("よし！ わかった。<br />");
										break;
									case 4:	// 真の本気とやらを見せろ
										if (Com.getRand0Cnt() >= 0) {
											Com.setLevel(4);
											if (Com.getRand0Cnt() == 0) Com.setRand0Cnt(1);
											ready("いいだろう、本気で打たせてもらうぜ。");
										} else {
											Queue.message("今はダメだ。理由は聞くな。");
										}
										break;
									}
								}
							});
							repeatReady++;
						} else {
							Queue.message("しつけーよ、もうダメだ。");
						}
						break;
					}
				}
			});
		}
	}

	// 対局終了後
	function endMessage() {
		var discNum = Rule.getDiscNum();
		var wldMessage;

		if (Com.getDisc() == null) {
			if (discNum.diff > 0) {
				wldMessage = "黒の勝ち";
			} else if (discNum.diff < 0) {
				wldMessage = "白の勝ち";
			} else {
				wldMessage = "引き分け";
			}
		} else {
			// 黒石の石差なので、プレイヤーの石差にする
			if (Com.getDisc() == Board.BLACK) discNum.diff = -discNum.diff;

			if (discNum.diff > 0) {
				wldMessage = "あなたの勝ち！";
			} else if (discNum.diff < 0) {
				wldMessage = "あなたの負け…";
				if (Com.getYsw() > 1) Com.setYsw(1);
			} else {
				wldMessage = "引き分け";
				if (Com.getYsw() > 1) Com.setYsw(1);
			}
		}

		var option = {
			message: "<div align='center'><div style='font-size: 160%;'>対局終了<br /><b>黒" + discNum.black + " - 白" + discNum.white + "</b></div>" + wldMessage + "</div>"
		};

		if (Com.getDisc() == null) {
			option.button = ["もう一局", "リセット"];
			option.callback = function (button) {
				Queue.dialog();

				switch (button) {
				case 1:	// もう一局
					startMessage();
					break;
				case 2:	// リセット
					Main.init(200, 300);
					break;
				}
			};

			Queue.dialog(option);
			Sound.play("even");
			return;
		}

		var comLevel = Com.getLevel();

		if (discNum.diff >= 64 && comLevel >= 2) {	// コンピューターのレベル2以上相手に完全勝利？
			option.button = ["生き返らせてやる", Com.getYsw() < 2 ? null : "お前に用はない"];
			if (Com.getYsw() == 1) Com.setYsw(2);
			option.callback = function (button) {
				switch (button) {
				case 1:	// 生き返らせてやる
					var option = {};
					setNextOption(option);

					Queue.dialog();
					Queue.interval(400);
					Queue.callback(function () {
						Com.getPlayerTurnMessage(-80, 1);	// キャラ画像をworstにする
					});
					Queue.message("ハァ、ハァ‥い、生き返った……。驚いたぜ…。");
					Queue.wait();
					if (option.button.length < 2) {
						Queue.callback(option.callback);
					} else {
						Queue.message("‥どうするよ？ もう一局か？");
						Queue.dialog(option);
					}
					break;
				case 2:	// お前に用はない
					Queue.dialog();
					Queue.callback(function () {
						Com.setYsw(3);
						Main.init(1500, 1000);
					});
					break;
				}
			};
		} else {
			setNextOption(option);
		}

		Queue.dialog(option);
		Queue.message(Com.getEndMessage(-discNum.diff, discNum.black, discNum.white, option.button.length < 2));

		if (discNum.diff > 10) {
			Sound.play("win");
		} else if (discNum.diff >= -10) {
			Sound.play("even");
		} else {
			Sound.play("loss");
		}

		function setNextOption(option) {
			if (discNum.diff < 0 || comLevel < 2 || comLevel == 2 && discNum.diff <= 10 || Com.getYsw() > 0) {
				// プレイヤーの負け or コンピューターのレベルが1 or コンピューターのレベル2相手に10石差以下で勝利 or 過去に条件を満たしている
				setReplayOption(option);

			} else {
				option.button = ["次へ"];
				option.callback = function () {
					Com.setYsw(1);
					Queue.dialog();
					Queue.callback(function () {
						Com.getPlayerTurnMessage();
					});
					Queue.message("お前つえーよ。よし、次の対局から俺の真の本気を見せてもいいぜ。<br />じゃ、どうする？ もう一局いく？");

					var option = {};
					setReplayOption(option);
					Queue.dialog(option);
				};
			}
		}

		function setReplayOption(option) {
			option.button = ["もう一局", "帰る"];
			option.callback = function (button) {
				Queue.dialog();

				switch (button) {
				case 1:	// もう一局
					startMessage("ふぅ…。さて、");
					break;
				case 2:	// 帰る
					Queue.message(Com.getExitMessage(0));
					setLastMessage();
					break;
				}
			};
		}

		function setLastMessage() {
			Queue.callback(function () {
				$(document).on("click.reset", function () {
					reset(false);
				});
			});
			Queue.interval(10000);
			Queue.callback(function () {
				$(document).off("click.reset");
			});
			Queue.message(Com.getExitMessage(1));
			Queue.callback(function () {
				$(document).on("click.reset", function () {
					reset(true);
				});
			});
		}

		function reset(lastFlag) {
			$(document).off("click.reset");
			Queue.clear();
			Queue.dialog({
				button: ["リセットする", "何もしない"],
				callback: function (button) {
					Queue.dialog();

					switch (button) {
					case 1:	// リセットする
						Main.init(200, 300);
						break;
					default:
						if (lastFlag) {
							$(document).on("click.reset", function () {
								reset(true);
							});
						} else {
							setLastMessage();
						}
						break;
					}
				},
				closeable: true
			});
		}
	}

	// 次の手番
	function nextTurn() {
		var turn = Rule.getTurn();

		if (turn.disc != null) {
			// 次の手番がある
			if (turn.disc == Com.getDisc()) {
				// コンピューターの手番
				Rule.hideCanFlip();
				if (!turn.passFlag) {
					turnCom();
				} else {
					Queue.message(Com.getPassMessage(0));
					Queue.dialog({
						message: "<span style='font-size: 140%;'>打てる箇所がないので…</span>",
						button: ["パスします"],
						callback: function () {
							Queue.dialog();
							turnCom(true);
						}
					});
				}

			} else {
				// プレイヤーの手番
				if (!turn.passFlag) {
					turnPlayer();
					Queue.message(comMessage);
				} else {
					Rule.hideCanFlip();
					if (Com.getDisc() == null) {
						Queue.dialog({
							message: "<span style='font-size: 140%;'>" + (turn.disc == Board.BLACK ? "白" : "黒") + "はパスです</span>",
							button: ["パス"],
							callback: function () {
								Queue.dialog();
								turnPlayer();
							}
						});
					} else {
						Queue.message(Com.getPassMessage(1));
						Queue.dialog({
							message: "<span style='margin: 5% 0; font-size: 140%;'>もう一度あなたの番です</span>",
							closeable: true,
							autoCloseTime: 1000,
							callback: turnPlayer
						});
					}
				}
			}

		} else {
			// 両者打てる箇所がもうないので対局終了
			Rule.hideCanFlip();
			setTimeout(endMessage, 300);
		}
	}

	// プレイヤーの手番
	function turnPlayer() {
		eventFlag = true;
		Rule.showCanFlip();
	}

	// コンピューターの手番
	//   noWaitFlag 間をおかずに打つ場合はtrueを指定する
	function turnCom(noWaitFlag) {
		// 思考中のメッセージ
		var timer = setTimeout(function () {
			Queue.message(Com.getThinkingMessage(0));
			timer = setTimeout(function () {
				Queue.message(Com.getThinkingMessage(1));
				timer = setTimeout(function () {
					Queue.message(Com.getThinkingMessage(1));
				}, 5000);
			}, 3000);
		}, 1000);

		var startTime = performance.now();

		Com.move(function (response) {
			clearTimeout(timer);
			var time = performance.now() - startTime;

			if (noWaitFlag || time >= 300) {
				time = 0;
			} else {
				// 間をおいて打つようにする
				time = 300 - time;
			}

			setTimeout(function () {
				comMessage = Com.getPlayerTurnMessage(response.score, response.depth);
				Rule.flip(response.move, Com.getPosRand());
				nextTurn();
			}, time);
		});
	}

	// 打った石を戻す
	function undo() {
		Rule.undo();
		var turn = Rule.getTurn();

		if (explainMode != 0) return;

		if (turn.disc == Com.getDisc() && turn.move > 0) {
			// コンピューターの打った箇所を戻した
			setTimeout(undo, 300);
		} else {
			// プレイヤーの打った箇所を戻した
			eventFlag = true;
			Rule.showCanFlip();
		}
	}

	// 解説
	//   square 打った箇所
	function explain(square) {
		switch (explainMode) {
		case 0:
			explainMode = 1;
			explain1();
			break;
		case 1:
			explainMode = 2;
			explain2();
			break;
		case 2:
			explainMode = 3;
			explain3();
			break;
		case 3:
			explainMode = 4;
			explain4(square);
			break;
		}
	}

	// 解説1
	function explain1() {
		Queue.message("まずルールは簡単だ。黒が先手、白が後手。<br />で、空いてる所に相手の石をはさむようにして打つ。");
		Queue.wait();
		Queue.message("はさめないと打てない。また、はさめる所がある限りパスはできない。");
		Queue.wait();
		Queue.message("石を打ったら、はさんだ相手の石を裏返して自分の石にする。");
		Queue.wait();
		Queue.message("最終的に石の多いほうの勝ちだが、これ以上の説明は実際やってみたほうが早いだろう。");
		Queue.wait();
		Queue.message("じゃあ次は戦術についてだ。<br /><b>俺流</b>に教えてやる。");
		Queue.wait();
		Queue.message("ちょっと待ちな。");
		Queue.callback(function () {
			var defer = $.Deferred();

			// 白が有利な配置
			var delay = 0;
			const black = [4, 12, 17, 18, 20, 21, 22, 25, 26, 27, 29, 32, 33, 37, 41, 42, 43, 44, 45, 46, 50];
			const white = [11, 19, 28, 34, 35, 36, 48];
			for (var i in black) {
				Board.setDisc(black[i], Board.BLACK, delay);
				delay += 20;
			}
			for (var i in white) {
				Board.setDisc(white[i], Board.WHITE, delay);
				delay += 20;
			}
			Rule.setDisc(Board.BLACK);

			Rule.markSquare.push(2);
			Rule.markSquare.push(3);
			Rule.markSquare.push(10);

			setTimeout(function () {
				defer.resolve();
			}, delay + 100);

			return defer;
		});
		Queue.message("まず、盤面を見てみな。ちなみに黒の番だ。");
		Queue.wait();
		Queue.message(repeatExplain1 < 2 ? "今どちらが有利だと思う？" : "もうどっちが有利か分かるよな？");
		Queue.dialog({
			button: ["黒", "白"],
			callback: function (button) {
				Queue.dialog();

				switch (button) {
				case 1:	// 黒
					Queue.message(repeatExplain1 < 2 ? "ハズレだ。正解は白。今は白が<b>圧倒的に優勢</b>なんだ。" : "おい！ 白が圧倒的に優勢だぞ。");
					Queue.wait();
					Queue.callback(Rule.showCanFlip);
					Queue.message("お、黒の打てる箇所が表示されたな。３ヵ所しかないだろ？");
					Queue.wait();
					Queue.message("どこでもいいから打ってみな。");
					Queue.callback(function () {
						eventFlag = true;
					});
					Queue.interval(5000);
					Queue.message("適当でいいぜ。");
					break;
				case 2:	// 白
					Queue.message(repeatExplain1 < 2 ? "ちっ、正解だ。" : "そうだ。");
					Queue.wait();
					Queue.callback(Rule.showCanFlip);
					Queue.message("黒が打てる箇所が表示されたが、３ヵ所しかない。");
					Queue.wait();
					Queue.message("どこでもいいからお前打ってみな。");
					Queue.callback(function () {
						eventFlag = true;
					});
					Queue.interval(5000);
					Queue.message("何も考えずに打っていいから。");
					break;
				}
			}
		});
	}

	// 解説2
	function explain2() {
		Rule.setDisc(Board.WHITE);
		Rule.hideCanFlip();
		Rule.markSquare.splice(0, Rule.markSquare.length);

		Queue.interval(300);
		Queue.message("次は白だが、打てる箇所を見てみろ。");
		Queue.callback(Rule.showCanFlip);
		Queue.wait();
		Queue.message("より取り見取り、こんなに打てる箇所があるんだ。");
		Queue.wait();
		Queue.callback(function () {
			undo();
			Rule.showCanFlip();
		});
		Queue.interval(200);
		Queue.message("それに比べて黒は寂しいだろ。");
		Queue.wait();
		Queue.message("これじゃ打ちたくねぇ所に打たされるのも時間の問題ってわけよ。");
		Queue.wait();
		Queue.message("初心者にありがちだが、原因は黒が序盤で石を取りすぎて、白を守る壁みたいになっちまったことだ。");
		Queue.wait();
		Queue.message("確かに、最終的には石が多いほうの勝ちだが、この段階で石を大量に取ってもどうせ返されるし、");
		Queue.wait();
		Queue.message("こんな壁を作っちまったら、変な所に打たされて終盤は連続パスからの大敗ってのがオチだ。");
		Queue.wait();
		Queue.callback(Rule.init);
		Queue.message("まとめると、序盤や中盤で石の大量取りは基本不利になるぞ。");
		Queue.wait();
		Queue.message("自分の打てる箇所の確保を常に意識することだ。");
		Queue.wait();
		Queue.callback(function () {
			Board.setDisc(0, Board.BLACK);
			Board.setDisc(7, Board.WHITE, 50);
			Board.setDisc(56, Board.WHITE, 100);
			Board.setDisc(63, Board.BLACK, 150);
		});
		Queue.interval(200);
		Queue.message("さて次は、四隅についてだ。");
		Queue.wait();
		Queue.message("『端っこさえ取れれば勝てる』<br />これも初級者にありがちだ。");
		Queue.wait();
		Queue.message("四隅を全て取ったのに負ける場合もあるぐらいだから、");
		Queue.wait();
		Queue.message("有利にはなりやすいが、絶対的なものじゃないってことは覚えておけ。");
		Queue.wait();
		Queue.callback(function () {
			var defer = $.Deferred();

			Board.setDisc(0, Board.EMPTY);
			Board.setDisc(7, Board.EMPTY);
			Board.setDisc(56, Board.EMPTY);
			Board.setDisc(63, Board.EMPTY);

			// 白ウィング配置
			var delay = 0;
			const black = [9, 10, 11, 13, 17, 18, 26, 27, 28, 34, 35, 37, 38];
			const white = [2, 3, 4, 5, 6, 12, 19, 20, 21, 22, 25, 29, 30, 33, 36, 43];
			for (var i in black) {
				Board.setDisc(black[i], Board.BLACK, delay);
				delay += 20;
			}
			for (var i in white) {
				Board.setDisc(white[i], Board.WHITE, delay);
				delay += 20;
			}
			Rule.setDisc(Board.WHITE);

			Rule.markSquare.push(0);
			Rule.showCanFlip();

			setTimeout(function () {
				defer.resolve();
			}, delay + 100);

			return defer;
		});
		Queue.message("分かりやすい例を提示した。今度は白の手番だ。ためしにA1に打ってみろ。");
		Queue.callback(function () {
			eventFlag = true;
		});
		Queue.interval(5000);
		Queue.message("お～い、A1に打つんだって。");
	}

	// 解説3
	function explain3() {
		Rule.hideCanFlip();
		Queue.interval(300);
		Queue.message("『端っこ取ったぜ！』って思うだろ？ しかしだ。");
		Queue.wait();
		Queue.callback(function () {
			Rule.flip(1);
		});
		Queue.interval(300);
		Queue.message("とまぁ、こうやってもぐりこまれて…");
		Queue.wait();
		Queue.callback(function () {
			Rule.flip(8);
		});
		Queue.interval(500);
		Queue.callback(function () {
			Rule.flip(7);
		});
		Queue.interval(300);
		Queue.message("こうやってB1～H1までの辺を一気に取られちまう。");
		Queue.wait();
		Queue.message("しかも、これは確定石と言って、もうひっくり返すことはできない。");
		Queue.wait();
		Queue.message("まぁ、白も多少確定石は増やせたが、有利になったとは言い難い。");
		Queue.wait();
		Queue.message("隅や辺じゃ、こうした攻防も珍しくないんだ。");
		Queue.wait();
		Queue.callback(Rule.init);
		Queue.message("じゃあ次へいこうか。");
		Queue.wait();
		Queue.message("ちょっと待ってろ。");
		Queue.callback(function () {
			var defer = $.Deferred();

			// 白が隅隣りに着手可能な配置
			var defer2 = null;
			$.each([19, 18, 26, 34, 17, 10, 3, 11, 20, 21, 2], function (index, square) {
				if (defer2 == null) {
					defer2 = flip(square);
				} else {
					defer2 = defer2.then(function () {
						return flip(square);
					});
				}
			});

			defer2.then(function () {
				Rule.markSquare.splice(0, Rule.markSquare.length);
				Rule.markSquare.push(1);
				Rule.markSquare.push(8);
				Rule.markSquare.push(9);
				Rule.showMark(1);
				Rule.showMark(8);
				Rule.showMark(9);

				defer.resolve();
			});

			return defer;

			function flip(square) {
				var defer = $.Deferred();
				Rule.flip(square);
				setTimeout(function () {
					defer.resolve();
				}, 100);
				return defer.promise();
			}
		});
		Queue.message("今度は隅のとなりについてだ。ちなみに白の手番な。");
		Queue.wait();
		Queue.message("打てる箇所は他にもあるが、ここでは隅どなりの三ヵ所だけに注目しな。");
		Queue.wait();
		Queue.message("まず、何も考えずにこのエリアに打つべきじゃない。不利になることが多いぞ。");
		Queue.wait();
		Queue.callback(function () {
			Rule.hideMark(1);
			Rule.hideMark(8);
		});
		// rubyとsvgの組み合わせがEdgeのバグで駄目なのでCSSでrubyを実現する(2019-12-01時点で <ruby>a</ruby><svg><text>a</text></svg> をEdgeで開いて確認)
		Queue.message("<br />中でも、<span data-ruby='エックス'>Ｘ</span>と呼ばれる隅の斜めどなりは特に注意だ。");
		Queue.wait();
		Queue.message("うまく打てば、さっきの隅の説明のように有利に運べることもあるが、基本は不利になる。");
		Queue.wait();
		Queue.callback(function () {
			Rule.markSquare.splice(0, Rule.markSquare.length);
			Rule.showCanFlip();
		});
		Queue.message("じゃあテストだ。お前ならどこに打つ？");
		Queue.callback(function () {
			eventFlag = true;
		});
		Queue.interval(5000);
		Queue.message("じっくり考えて手を選びな。");
	}

	// 解説4
	//   square 打った箇所
	function explain4(square) {
		Rule.setDisc(Board.BLACK);
		Rule.hideCanFlip();
		Queue.interval(300);

		switch (square) {
		case 1:
			Queue.message("そこは最悪だ。下手すりゃ全滅負けの線もある大悪手だぞ。俺が黒なら…");
			Queue.wait();
			Queue.callback(function () {
				Rule.flip(0);
			});
			Queue.message("A1に打って、白は大敗確定だ。");
			Queue.wait();
			Queue.message("っていうか、さっき隅どなりの三ヵ所は基本不利って説明したばかりだろうが。");
			Queue.wait();
			Queue.message("テストは文句なしの不合格だ。");
			Queue.wait();
			break;
		case 8:
			Queue.message("おいおい、さっきの説明聞いてなかったのかよ。そこは悪手だぜ。");
			Queue.wait();
			Queue.message("お前の打った箇所は不合格だ。");
			Queue.wait();
			break;
		case 9:
			Queue.message("おい！ 何を聞いてたんだ？ Ｘ打ちは特に注意って言ったぞ。");
			Queue.wait();
			Queue.message("不合格だな。");
			Queue.wait();
			break;
		case 12:
			Queue.message("ふむふむ、隅どなりの三ヵ所はさけたな。だが、そこも実は良くない手だったりする。");
			Queue.wait();
			Queue.message("三ヵ所よりはマシなだけだ。ま、合格にしといてやるけどな。");
			Queue.wait();
			break;
		case 13:
			Queue.message("おお、考えたうえでそこに打ったのなら、いい線いってるぞ。");
			Queue.wait();
			if (repeatExplain1 < 2) {
				Queue.callback(function () {
					var level = Com.getLevel();
					Com.setLevel(2);
					Com.getPlayerTurnMessage(-20, 1);	// キャラ画像をworseにする
					Com.setLevel(level);
				});
				Queue.message("ほ、本当はまぐれだろ？");
				Queue.wait();
				Queue.callback(function () {
					Com.getPlayerTurnMessage();
				});
				Queue.message("チッ、合格だ。");
			} else {
				Queue.message("合格だ。");
			}
			Queue.wait();
			break;
		case 16:
			Queue.message("最初の説明もう忘れたのか？ 石の大量取りは危険だ、って。");
			Queue.wait();
			Queue.message("見事なまでの白壁を形成しちまってるな。");
			Queue.wait();
			if (repeatExplain1 < 2) {
				Queue.callback(function () {
					var level = Com.getLevel();
					Com.setLevel(2);
					Com.getPlayerTurnMessage(100, 1);	// キャラ画像をbetterにする
					Com.setLevel(level);
				});
				Queue.message("フフ、けど合格だ。");
				Queue.wait();
				Queue.callback(function () {
					Com.getPlayerTurnMessage();
				});
			} else {
				Queue.message("一応、合格にはしておく。");
				Queue.wait();
			}
			break;
		}

		Queue.message("さて、他にも序盤の戦い方、いろんな戦術があるが、教えてやれるのはここまでだ。");
		Queue.wait();
		if (repeatExplain1 < 2) {
			Queue.message("なぜかって？");
			Queue.wait();
			Queue.callback(function () {
				Com.getPlayerTurnMessage(20, -2);	// キャラ画像をwin20にする
			});
			Queue.message("本当に強くなられちゃ困るからだ！");
			Queue.wait();
			Queue.message("これらの戦術は基本中の基本。");
			Queue.wait();
			Queue.message("『これなら強くなれそう』と思わせてカモにするのも基本だろ？");
			Queue.wait();
			Queue.message("それでもと言うのなら、実戦でその先を学ぶことだな。");
			Queue.wait();
			Queue.callback(function () {
				Com.getPlayerTurnMessage();
			});
		}
		Queue.message("…で、これら戦術に例外はつきものだが、加えて先を読むことも重要だ。");
		Queue.wait();
		Queue.message("よし、解説はこれぐらいでいいだろう。");
		Queue.wait();
		if (repeatExplain1 < 2) {
			Queue.callback(function () {
				var level = Com.getLevel();
				Com.setLevel(2);
				Com.getPlayerTurnMessage(100, 1);	// キャラ画像をbetterにする
				Com.setLevel(level);
			});
		}
		Queue.message("じゃ、そろそろ始めるか。");
		Queue.wait();
		Queue.callback(function () {
			explainMode = 0;
			startMessage();
		});
	}
}();
