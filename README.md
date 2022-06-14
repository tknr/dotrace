# dotraceDotrace.js v0.4
created by defghi1977(https://defghi1977-onblog.blogspot.jp/, https://twitter.com/defghi1977)
released at http://defghi1977.html.xdomain.jp/tech/dotrace/dotrace.htm

[これは何?]
ドット絵SVG化スクリプト:改訂3版(http://defghi1977.html.xdomain.jp/tech/img2svg3/dot2svg3.htm)
のパス出力エンジンをNode.js環境に移植したものです.

[動作原理]
ピクセルデータ(Uint8Array型/RGBA)を元に色ごとにピクセルをトレースしSVGのパス文字列を生成します.
得られたパス文字列をSVG文書として組み立てることで元の画像と等価なSVGグラフィックが得られます.
DOMへの依存を排除したため, 理論上はどこでも動作します.

[動作条件]
・Node.js
Node.jsのなるべく新しいもの.
画像ファイルをデコードするライブラリ(node-canvas, Jimp等)
・ブラウザ
FireFox,Chrome,Safari等canvas要素をサポートするもの(のなるべく新しいもの)
or 画像ファイルをデコードするライブラリ(node-canvas, Jimp等)

[使い方]
適当な位置に「dotrace.core.js」を展開しスクリプトとして読み込むと専用のAPIが定義されるので
必要に応じて画像データを渡してSVG化します.
NOTE:
dotrace.jsが出力するSVGは基本的な内容です. より高度(複雑)な出力を要する場合は
得られたSVG文字列を加工する, もしくはtrace/dotToShapeメソッドを用いて自力でSVGを構築します.

//Node.jsでの例
"use strict";
(async () => {
	const Dotrace = require("./dotrace.core.js");
	const Jimp = require("jimp");
	const fn = process.argv[2];
	if(!fn){return;}
	const img = await Jimp.read(fn);
	const bmp = img.bitmap;
	const svg = Dotrace.toSVG(bmp.data, bmp.width, bmp.height);
	process.stdout.write(svg);
})();

//windowでの例
<script src="dotrace.core.js"></script>
<img id="img" src="test.gif"/>
<img id="result" src=""/>
<script>
img.onload = e => {
	const canvas = document.createElement("canvas");
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	const ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0);
	const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	const svg = Dotrace.toSVG(data, canvas.width, canvas.height);
	result.src = URL.createObjectURL(new Blob([svg], {type: "image/svg+xml"}));
};
</script>

//workerでの例
//window側
<script src="dotrace.core.js"></script>
<img id="img" src="test.gif"/>
<img id="result" src=""/>
<script>
img.onload = e => {
	const canvas = document.createElement("canvas");
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	const ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0);
	const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	const svg = Dotrace.toSVG(data, canvas.width, canvas.height);
	result.src = URL.createObjectURL(new Blob([svg], {type: "image/svg+xml"}));
};
</script>
//worker側
"use strict";
importScripts("dotrace.core.js");
{
	self.onmessage = e => {
		const d = e.data;
		self.postMessage(Dotrace.toSVG(d.data, d.w, d.h));
	};
}

[API]
○Dotrace.trace(data, w, h)
ピクセルデータを囲うベクタのSVGパス文字列表現を得る
ピクセルの仕分けはピクセルの色をもとに行う
data:ピクセルデータUint8Array/Uint8ClampedArray
w:画像の幅
h:画像の高さ
return:Map(キー:ピクセルの色, 値:色に対応するパス文字列)

○Dotrace.dotToShape(data, w, h, shape)
ピクセルデータを元に形付きドット絵を生成する
ピクセルの仕分けはピクセルの色をもとに行う
data:ピクセルデータUint8Array/Uint8ClampedArray
w:画像の幅
h:画像の高さ
shape:ピクセル形状(1×1の範囲に収まるSVGパス文字列)
コマンドは左上を基準に全て相対コマンドで指定して下さい.
例)m0 .5a.5.5 0 1 1 1 0 .5.5 0 1 1-1 0z[円]
return:Map(キー:ピクセルの色, 値:色に対応するパス文字列)

○Dotrace.splitColor(color)
Dotrace.traceとDotrace.dotToShapeで取得した色のRGBA値を配列として取得する
color:色数値(aabbggrr)
return:色要素配列(r,g,b,a)0〜255

○Dotrace.formatColor(color)
Dotrace.traceとDotrace.dotToShapeで取得した色のRGB値をCSS形式に変換する
color:色数値(aabbggrr)
return:CSS色文字列(例:#00FF00)

○Dotrace.opacity(color)
Dotrace.traceとDotrace.dotToShapeで取得した色のアルファ値を取得する
color:色数値(aabbggrr)
return:アルファ値(0〜1)

○Dotrace.normalizePixel(data)
ピクセルデータをcanvas要素が生成するピクセルデータと互換のものとする
透明ピクセルの色値を黒の透明に揃える
data:Uint8Array/Uint8ClampedArray
return:Uint8Array

○Dotrace.toSVG(data, w, h, s, shape, useDTD)
指定したピクセルデータを元にSVG文字列を生成する
data:ピクセルデータUint8Array/Uint8ClampedArray
w:画像の幅
h:画像の高さ
s:画像のスケール
shape:ピクセル形状(1×1の範囲に収まるSVGパス文字列)
useDTD:ピクセル形状の埋め込みにDTDエンティティを用いる
Note:trueとするとファイルサイズが抑えられる代償としてSVGの動作環境が限られます.

○Dotrace.shapes
Dotrace.toSVGのshapeパラメータに渡す図形形状を収録しています.
dia◆, circle●, topleft◤, topright◥, bottomleft◣, bottomright◢

[ライセンス]
MIT

[更新履歴]
2017/12/09 ver0.1 新規作成
2017/12/10 ver0.2 normalizePixelメソッドを追加(Jimpで得たピクセルデータをcanvas要素互換とする)
2017/12/16 ver0.3 ドット形状のサンプルを追加
2017/12/28 ver0.4 formatColorメソッドが返すHEX色文字列の先頭に#を追加, splitColorメソッドを追加
