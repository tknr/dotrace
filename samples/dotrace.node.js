"use strict";
(async () => {
	const Dotrace = require("../dotrace.core.js");
	const Jimp = require("jimp");
	const fn = process.argv[2];
	if(!fn){return;}
	const img = await Jimp.read(fn);
	const bmp = img.bitmap;
	const svg = Dotrace.toSVG(bmp.data, bmp.width, bmp.height, 15, Dotrace.shapes.circle, true);
	process.stdout.write(svg);
})();
