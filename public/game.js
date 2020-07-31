const Game=new function(){var e,u=!1,a=0,s=0,t=0;function i(u,a){if(Rule.init(),Com.getYsw()>=3)n();else{e=Com.getPlayerTurnMessage(),a&&(s=t=0),Com.getRand0Cnt()>=2?(Com.getLevel()>=4&&Com.setLevel(3),Com.setRand0Cnt(-8),u="ふぅ‥‥。なんだか調子悪いが、"):-1==Com.getRand0Cnt()?(Com.setRand0Cnt(0),u="ふぅ、やっと調子が戻ったか…。<br />"):0!=Com.getRand0Cnt()&&Com.setRand0Cnt(Com.getRand0Cnt()+1),Queue.message((u||"")+"お前は先手・後手どっちにするんだ？"),Queue.dialog({button:["先手(黒)","後手(白)","お前が決めろ",Com.getYsw()>0||t>=3?null:"その前にオセロを教えろ"],callback:function(e){switch(e){case 1:Com.setDisc(Board.WHITE),o();break;case 2:Com.setDisc(Board.BLACK),o();break;case 3:Com.setDisc(Math.random()<.5?Board.BLACK:Board.WHITE),o();break;case 4:Queue.dialog(),s<1?t<1?Queue.message("俺に教えを乞うのか。最後まで聞く気はあるんだろうな？"):Queue.message("どっちなのかはっきりしろ！ 最後まで聞くか？"):Queue.message("また聞くのか？ 途中でやめるは無しだぞ？"),Queue.dialog({button:["ＯＫ","じゃあ、やめる"],callback:function(e){switch(Queue.dialog(),e){case 1:s++,Q();break;case 2:i(++t<3?"ならもっかい聞くぞ。<br />":"もういい。<br />")}}})}}});var l=0}function o(e){t=0,Queue.dialog(),Com.getDisc()==Board.BLACK?Queue.message((e||"")+"お前が後手(白)、俺が先手(黒)ね。<br />じゃあ、俺から打つぜ。準備はOK？"):Queue.message((e||"")+"お前が先手(黒)、俺が後手(白)ね。<br />じゃあ、対局だ。準備はOK？"),Queue.dialog({message:"準備はOK？",button:["OK","待て"],callback:function(e){switch(e){case 1:Queue.dialog(),n();break;case 2:if(l<3){switch(Queue.dialog(),l){case 0:Queue.message("なんだ？");break;case 1:Queue.message("どれくらいにしてほしい？<br />ったく、とっとと決めて、はやく対局しようぜ。");break;default:Queue.message("なんだよ、しつこいぞ。")}Queue.dialog({button:["手加減しろ","いつもどおり打て","本気で打て",Com.getYsw()>0?"真の本気とやらを見せろ":null],callback:function(e){switch(e){case 1:Com.setLevel(1),o("ちっ、わかったよ。<br />");break;case 2:Com.setLevel(2),o("OK、いいぜ。<br />");break;case 3:Com.setLevel(3),o("よし！ わかった。<br />");break;case 4:Com.getRand0Cnt()>=0?(Com.setLevel(4),0==Com.getRand0Cnt()&&Com.setRand0Cnt(1),o("いいだろう、本気で打たせてもらうぜ。")):Queue.message("今はダメだ。理由は聞くな。")}}}),l++}else Queue.message("しつけーよ、もうダメだ。")}}})}}function l(){var e,u=Rule.getDiscNum();null==Com.getDisc()?e=u.diff>0?"黒の勝ち":u.diff<0?"白の勝ち":"引き分け":(Com.getDisc()==Board.BLACK&&(u.diff=-u.diff),u.diff>0?e="あなたの勝ち！":u.diff<0?(e="あなたの負け…",Com.getYsw()>1&&Com.setYsw(1)):(e="引き分け",Com.getYsw()>1&&Com.setYsw(1)));var a={message:"<div align='center'><div style='font-size: 160%;'>対局終了<br /><b>黒"+u.black+" - 白"+u.white+"</b></div>"+e+"</div>"};if(null==Com.getDisc())return a.button=["もう一局","リセット"],a.callback=function(e){switch(Queue.dialog(),e){case 1:i();break;case 2:Main.init(200,300)}},Queue.dialog(a),void Sound.play("even");var s=Com.getLevel();function t(e){u.diff<0||s<2||2==s&&u.diff<=10||Com.getYsw()>0?l(e):(e.button=["次へ"],e.callback=function(){Com.setYsw(1),Queue.dialog(),Queue.callback(function(){Com.getPlayerTurnMessage()}),Queue.message("お前つえーよ。よし、次の対局から俺の真の本気を見せてもいいぜ。<br />じゃ、どうする？ もう一局いく？");var e={};l(e),Queue.dialog(e)})}function l(e){e.button=["もう一局","帰る"],e.callback=function(e){switch(Queue.dialog(),e){case 1:i("ふぅ…。さて、");break;case 2:Queue.message(Com.getExitMessage(0)),n()}}}function n(){Queue.callback(function(){$(document).on("click.reset",function(){o(!1)})}),Queue.interval(1e4),Queue.callback(function(){$(document).off("click.reset")}),Queue.message(Com.getExitMessage(1)),Queue.callback(function(){$(document).on("click.reset",function(){o(!0)})})}function o(e){$(document).off("click.reset"),Queue.clear(),Queue.dialog({button:["リセットする","何もしない"],callback:function(u){switch(Queue.dialog(),u){case 1:Main.init(200,300);break;default:e?$(document).on("click.reset",function(){o(!0)}):n()}},closeable:!0})}u.diff>=64&&s>=2?(a.button=["生き返らせてやる",Com.getYsw()<2?null:"お前に用はない"],1==Com.getYsw()&&Com.setYsw(2),a.callback=function(e){switch(e){case 1:var u={};t(u),Queue.dialog(),Queue.interval(400),Queue.callback(function(){Com.getPlayerTurnMessage(-80,1)}),Queue.message("ハァ、ハァ‥い、生き返った……。驚いたぜ…。"),Queue.wait(),u.button.length<2?Queue.callback(u.callback):(Queue.message("‥どうするよ？ もう一局か？"),Queue.dialog(u));break;case 2:Queue.dialog(),Queue.callback(function(){Com.setYsw(3),Main.init(1500,1e3)})}}):t(a),Queue.dialog(a),Queue.message(Com.getEndMessage(-u.diff,u.black,u.white,a.button.length<2)),u.diff>10?Sound.play("win"):u.diff>=-10?Sound.play("even"):Sound.play("loss")}function n(){var u=Rule.getTurn();null!=u.disc?u.disc==Com.getDisc()?(Rule.hideCanFlip(),u.passFlag?(Queue.message(Com.getPassMessage(0)),Queue.dialog({message:"<span style='font-size: 140%;'>打てる箇所がないので…</span>",button:["パスします"],callback:function(){Queue.dialog(),c(!0)}})):c()):u.passFlag?(Rule.hideCanFlip(),null==Com.getDisc()?Queue.dialog({message:"<span style='font-size: 140%;'>"+(u.disc==Board.BLACK?"白":"黒")+"はパスです</span>",button:["パス"],callback:function(){Queue.dialog(),o()}}):(Queue.message(Com.getPassMessage(1)),Queue.dialog({message:"<span style='margin: 5% 0; font-size: 140%;'>もう一度あなたの番です</span>",closeable:!0,autoCloseTime:1e3,callback:o}))):(o(),Queue.message(e)):(Rule.hideCanFlip(),setTimeout(l,300))}function o(){u=!0,Rule.showCanFlip()}function c(u){var a=setTimeout(function(){Queue.message(Com.getThinkingMessage(0)),a=setTimeout(function(){Queue.message(Com.getThinkingMessage(1)),a=setTimeout(function(){Queue.message(Com.getThinkingMessage(1))},5e3)},3e3)},1e3),s=performance.now();Com.move(function(t){clearTimeout(a);var i=performance.now()-s;i=u||i>=300?0:300-i,setTimeout(function(){e=Com.getPlayerTurnMessage(t.score,t.depth),Rule.flip(t.move,Com.getPosRand()),n()},i)})}function g(){Rule.undo();var e=Rule.getTurn();0==a&&(e.disc==Com.getDisc()&&e.move>0?setTimeout(g,300):(u=!0,Rule.showCanFlip()))}function Q(e){switch(a){case 0:a=1,Queue.message("まずルールは簡単だ。黒が先手、白が後手。<br />で、空いてる所に相手の石をはさむようにして打つ。"),Queue.wait(),Queue.message("はさめないと打てない。また、はさめる所がある限りパスはできない。"),Queue.wait(),Queue.message("石を打ったら、はさんだ相手の石を裏返して自分の石にする。"),Queue.wait(),Queue.message("最終的に石の多いほうの勝ちだが、これ以上の説明は実際やってみたほうが早いだろう。"),Queue.wait(),Queue.message("じゃあ次は戦術についてだ。<br /><b>俺流</b>に教えてやる。"),Queue.wait(),Queue.message("ちょっと待ちな。"),Queue.callback(function(){var e=$.Deferred(),u=0;const a=[4,12,17,18,20,21,22,25,26,27,29,32,33,37,41,42,43,44,45,46,50],s=[11,19,28,34,35,36,48];for(var t in a)Board.setDisc(a[t],Board.BLACK,u),u+=20;for(var t in s)Board.setDisc(s[t],Board.WHITE,u),u+=20;return Rule.setDisc(Board.BLACK),Rule.markSquare.push(2),Rule.markSquare.push(3),Rule.markSquare.push(10),setTimeout(function(){e.resolve()},u+100),e}),Queue.message("まず、盤面を見てみな。ちなみに黒の番だ。"),Queue.wait(),Queue.message(s<2?"今どちらが有利だと思う？":"もうどっちが有利か分かるよな？"),Queue.dialog({button:["黒","白"],callback:function(e){switch(Queue.dialog(),e){case 1:Queue.message(s<2?"ハズレだ。正解は白。今は白が<b>圧倒的に優勢</b>なんだ。":"おい！ 白が圧倒的に優勢だぞ。"),Queue.wait(),Queue.callback(Rule.showCanFlip),Queue.message("お、黒の打てる箇所が表示されたな。３ヵ所しかないだろ？"),Queue.wait(),Queue.message("どこでもいいから打ってみな。"),Queue.callback(function(){u=!0}),Queue.interval(5e3),Queue.message("適当でいいぜ。");break;case 2:Queue.message(s<2?"ちっ、正解だ。":"そうだ。"),Queue.wait(),Queue.callback(Rule.showCanFlip),Queue.message("黒が打てる箇所が表示されたが、３ヵ所しかない。"),Queue.wait(),Queue.message("どこでもいいからお前打ってみな。"),Queue.callback(function(){u=!0}),Queue.interval(5e3),Queue.message("何も考えずに打っていいから。")}}});break;case 1:a=2,Rule.setDisc(Board.WHITE),Rule.hideCanFlip(),Rule.markSquare.splice(0,Rule.markSquare.length),Queue.interval(300),Queue.message("次は白だが、打てる箇所を見てみろ。"),Queue.callback(Rule.showCanFlip),Queue.wait(),Queue.message("より取り見取り、こんなに打てる箇所があるんだ。"),Queue.wait(),Queue.callback(function(){g(),Rule.showCanFlip()}),Queue.interval(200),Queue.message("それに比べて黒は寂しいだろ。"),Queue.wait(),Queue.message("これじゃ打ちたくねぇ所に打たされるのも時間の問題ってわけよ。"),Queue.wait(),Queue.message("初心者にありがちだが、原因は黒が序盤で石を取りすぎて、白を守る壁みたいになっちまったことだ。"),Queue.wait(),Queue.message("確かに、最終的には石が多いほうの勝ちだが、この段階で石を大量に取ってもどうせ返されるし、"),Queue.wait(),Queue.message("こんな壁を作っちまったら、変な所に打たされて終盤は連続パスからの大敗ってのがオチだ。"),Queue.wait(),Queue.callback(Rule.init),Queue.message("まとめると、序盤や中盤で石の大量取りは基本不利になるぞ。"),Queue.wait(),Queue.message("自分の打てる箇所の確保を常に意識することだ。"),Queue.wait(),Queue.callback(function(){Board.setDisc(0,Board.BLACK),Board.setDisc(7,Board.WHITE,50),Board.setDisc(56,Board.WHITE,100),Board.setDisc(63,Board.BLACK,150)}),Queue.interval(200),Queue.message("さて次は、四隅についてだ。"),Queue.wait(),Queue.message("『端っこさえ取れれば勝てる』<br />これも初級者にありがちだ。"),Queue.wait(),Queue.message("四隅を全て取ったのに負ける場合もあるぐらいだから、"),Queue.wait(),Queue.message("有利にはなりやすいが、絶対的なものじゃないってことは覚えておけ。"),Queue.wait(),Queue.callback(function(){var e=$.Deferred();Board.setDisc(0,Board.EMPTY),Board.setDisc(7,Board.EMPTY),Board.setDisc(56,Board.EMPTY),Board.setDisc(63,Board.EMPTY);var u=0;const a=[9,10,11,13,17,18,26,27,28,34,35,37,38],s=[2,3,4,5,6,12,19,20,21,22,25,29,30,33,36,43];for(var t in a)Board.setDisc(a[t],Board.BLACK,u),u+=20;for(var t in s)Board.setDisc(s[t],Board.WHITE,u),u+=20;return Rule.setDisc(Board.WHITE),Rule.markSquare.push(0),Rule.showCanFlip(),setTimeout(function(){e.resolve()},u+100),e}),Queue.message("分かりやすい例を提示した。今度は白の手番だ。ためしにA1に打ってみろ。"),Queue.callback(function(){u=!0}),Queue.interval(5e3),Queue.message("お～い、A1に打つんだって。");break;case 2:a=3,Rule.hideCanFlip(),Queue.interval(300),Queue.message("『端っこ取ったぜ！』って思うだろ？ しかしだ。"),Queue.wait(),Queue.callback(function(){Rule.flip(1)}),Queue.interval(300),Queue.message("とまぁ、こうやってもぐりこまれて…"),Queue.wait(),Queue.callback(function(){Rule.flip(8)}),Queue.interval(500),Queue.callback(function(){Rule.flip(7)}),Queue.interval(300),Queue.message("こうやってB1～H1までの辺を一気に取られちまう。"),Queue.wait(),Queue.message("しかも、これは確定石と言って、もうひっくり返すことはできない。"),Queue.wait(),Queue.message("まぁ、白も多少確定石は増やせたが、有利になったとは言い難い。"),Queue.wait(),Queue.message("隅や辺じゃ、こうした攻防も珍しくないんだ。"),Queue.wait(),Queue.callback(Rule.init),Queue.message("じゃあ次へいこうか。"),Queue.wait(),Queue.message("ちょっと待ってろ。"),Queue.callback(function(){var e=$.Deferred(),u=null;return $.each([19,18,26,34,17,10,3,11,20,21,2],function(e,s){u=null==u?a(s):u.then(function(){return a(s)})}),u.then(function(){Rule.markSquare.splice(0,Rule.markSquare.length),Rule.markSquare.push(1),Rule.markSquare.push(8),Rule.markSquare.push(9),Rule.showMark(1),Rule.showMark(8),Rule.showMark(9),e.resolve()}),e;function a(e){var u=$.Deferred();return Rule.flip(e),setTimeout(function(){u.resolve()},100),u.promise()}}),Queue.message("今度は隅のとなりについてだ。ちなみに白の手番な。"),Queue.wait(),Queue.message("打てる箇所は他にもあるが、ここでは隅どなりの三ヵ所だけに注目しな。"),Queue.wait(),Queue.message("まず、何も考えずにこのエリアに打つべきじゃない。不利になることが多いぞ。"),Queue.wait(),Queue.callback(function(){Rule.hideMark(1),Rule.hideMark(8)}),Queue.message("<br />中でも、<span data-ruby='エックス'>Ｘ</span>と呼ばれる隅の斜めどなりは特に注意だ。"),Queue.wait(),Queue.message("うまく打てば、さっきの隅の説明のように有利に運べることもあるが、基本は不利になる。"),Queue.wait(),Queue.callback(function(){Rule.markSquare.splice(0,Rule.markSquare.length),Rule.showCanFlip()}),Queue.message("じゃあテストだ。お前ならどこに打つ？"),Queue.callback(function(){u=!0}),Queue.interval(5e3),Queue.message("じっくり考えて手を選びな。");break;case 3:a=4,function(e){switch(Rule.setDisc(Board.BLACK),Rule.hideCanFlip(),Queue.interval(300),e){case 1:Queue.message("そこは最悪だ。下手すりゃ全滅負けの線もある大悪手だぞ。俺が黒なら…"),Queue.wait(),Queue.callback(function(){Rule.flip(0)}),Queue.message("A1に打って、白は大敗確定だ。"),Queue.wait(),Queue.message("っていうか、さっき隅どなりの三ヵ所は基本不利って説明したばかりだろうが。"),Queue.wait(),Queue.message("テストは文句なしの不合格だ。"),Queue.wait();break;case 8:Queue.message("おいおい、さっきの説明聞いてなかったのかよ。そこは悪手だぜ。"),Queue.wait(),Queue.message("お前の打った箇所は不合格だ。"),Queue.wait();break;case 9:Queue.message("おい！ 何を聞いてたんだ？ Ｘ打ちは特に注意って言ったぞ。"),Queue.wait(),Queue.message("不合格だな。"),Queue.wait();break;case 12:Queue.message("ふむふむ、隅どなりの三ヵ所はさけたな。だが、そこも実は良くない手だったりする。"),Queue.wait(),Queue.message("三ヵ所よりはマシなだけだ。ま、合格にしといてやるけどな。"),Queue.wait();break;case 13:Queue.message("おお、考えたうえでそこに打ったのなら、いい線いってるぞ。"),Queue.wait(),s<2?(Queue.callback(function(){var e=Com.getLevel();Com.setLevel(2),Com.getPlayerTurnMessage(-20,1),Com.setLevel(e)}),Queue.message("ほ、本当はまぐれだろ？"),Queue.wait(),Queue.callback(function(){Com.getPlayerTurnMessage()}),Queue.message("チッ、合格だ。")):Queue.message("合格だ。"),Queue.wait();break;case 16:Queue.message("最初の説明もう忘れたのか？ 石の大量取りは危険だ、って。"),Queue.wait(),Queue.message("見事なまでの白壁を形成しちまってるな。"),Queue.wait(),s<2?(Queue.callback(function(){var e=Com.getLevel();Com.setLevel(2),Com.getPlayerTurnMessage(100,1),Com.setLevel(e)}),Queue.message("フフ、けど合格だ。"),Queue.wait(),Queue.callback(function(){Com.getPlayerTurnMessage()})):(Queue.message("一応、合格にはしておく。"),Queue.wait())}Queue.message("さて、他にも序盤の戦い方、いろんな戦術があるが、教えてやれるのはここまでだ。"),Queue.wait(),s<2&&(Queue.message("なぜかって？"),Queue.wait(),Queue.callback(function(){Com.getPlayerTurnMessage(20,-2)}),Queue.message("本当に強くなられちゃ困るからだ！"),Queue.wait(),Queue.message("これらの戦術は基本中の基本。"),Queue.wait(),Queue.message("『これなら強くなれそう』と思わせてカモにするのも基本だろ？"),Queue.wait(),Queue.message("それでもと言うのなら、実戦でその先を学ぶことだな。"),Queue.wait(),Queue.callback(function(){Com.getPlayerTurnMessage()}));Queue.message("…で、これら戦術に例外はつきものだが、加えて先を読むことも重要だ。"),Queue.wait(),Queue.message("よし、解説はこれぐらいでいいだろう。"),Queue.wait(),s<2&&Queue.callback(function(){var e=Com.getLevel();Com.setLevel(2),Com.getPlayerTurnMessage(100,1),Com.setLevel(e)});Queue.message("じゃ、そろそろ始めるか。"),Queue.wait(),Queue.callback(function(){a=0,i()})}(e)}}this.create=function(){Board.createBoard(),Board.click=function(e){if(u){Queue.clear();var s=Rule.canFlip(e);if(!s||0!=a&&0!=Rule.markSquare.length&&-1==Rule.markSquare.indexOf(e)){if(Com.getYsw()<3)if(0==a){var t=Com.getCantFlipMessage(Board.getDisc(e)==Board.EMPTY?0:1);Queue.message(t),Queue.interval(500+100*t.length),Queue.message(Com.getCantFlipMessage(2))}else s?Queue.message("そこは打てるけど、今は従ってくれ。"):Queue.message("そこは無理だぞ。");Rule.animCantFlip(e,s)}else u=!1,Rule.flip(e),0==a?n():Q(e)}},$("#messageContainer").click(function(){if(u&&0==a)if(u=!1,Rule.hideCanFlip(),Queue.clear(!0),Com.getYsw()>=3)Queue.dialog({button:["戻す","リセット","何もしない"],callback:function(e){if(0==e)return u=!0,void Rule.showCanFlip();switch(Queue.dialog(),e){case 1:Rule.getTurn().move>0?g():l();break;case 2:l();break;case 3:u=!0,Rule.showCanFlip()}},closeable:!0});else{var e=Com.getLevel(),s="強さ："+(1==e?"手加減":2==e?"いつもどおり":3==e?"本気":"ドーピング")+"<br />調子：";if(Com.getYsw()>0)if(Com.getRand0Cnt()>0)s+="ドーピング";else if(Com.getRand0Cnt()<0)s+="最悪";else{var t=Com.getMoveRand();s+=t<300?"良い":t<400?"普通":t<500?"いまいち":"悪い"}else s+="？";Queue.dialog({message:s,button:["待った！","始めからやり直したい","何も言わない"],callback:function(e){if(0==e)return u=!0,void Rule.showCanFlip();switch(Queue.dialog(),e){case 1:Rule.getTurn().move>1?(Queue.message(Com.getUndoMessage(0)),g()):(Queue.message(Com.getUndoMessage(1)),Queue.dialog({button:["はい","いいえ"],callback:function(e){switch(Queue.dialog(),e){case 1:i("ふぅ…。さて、");break;case 2:Queue.message(Com.getUndoMessage(3)),u=!0,Rule.showCanFlip()}}}));break;case 2:Queue.message(Com.getUndoMessage(2)),Queue.dialog({button:["はい","やっぱ、いい"],callback:function(e){switch(Queue.dialog(),e){case 1:i("ふぅ…。さて、");break;case 2:Queue.message(Com.getUndoMessage(3)),u=!0,Rule.showCanFlip()}}});break;case 3:u=!0,Rule.showCanFlip()}},closeable:!0})}function l(){Queue.dialog({message:"リセットしますか？",button:["はい","いいえ"],callback:function(e){switch(Queue.dialog(),e){case 1:Main.init(200,300);break;case 2:u=!0,Rule.showCanFlip()}}})}})},this.startMessage=i};