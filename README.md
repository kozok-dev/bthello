# Webオセロアプリ

https://kozok-dev.github.io/bthello/<br>
※音が出ます

## 概要

クセのあるコンピューターと対戦できるシンプルWebオセロゲーム

## 動作環境

Firefox、Chrome、Edge等のモダンブラウザなら動作すると思う。IEは不可。<br>
スマホやタブレットも余程古くなければ大丈夫のはず。

## 特徴

- レスポンシブデザイン
- 盤面をSVGで表現
- いろいろアニメーションする
- 非同期処理、Promise
- Web Audio APIによる自作の効果音再生
- PWAなのでスマホアプリにもなれる
- クセのあるリアクションをするコンピューター
- png化した定石、思考データの読み込み
- 思考部分はWeb Worker
- 中盤、終盤の思考はasm.js

## 開発

### インストール

```
npm install
```

### テスト

```
node node_modules/grunt/bin/grunt serve
```

の後、`https://localhost/`にアクセス。ドキュメントルートは`src`。

#### PWA

Chromeに

```
--ignore-certificate-errors --unsafely-treat-insecure-origin-as-secure=https://localhost/ --allow-insecure-localhost --user-data-dir=/work/chrome
```

という引数を付けて実行する。

### 本番ビルド

```
node node_modules/grunt/bin/grunt
```

で`public`ディレクトリに一式が生成される。
