/*
Dotrace.js v0.4
convert pixel art to svg path strings

MIT License

Copyright 2017 defghi1977(https://defghi1977-onblog.blogspot.jp/ , https://twitter.com/defghi1977)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
"use strict";
{
	//namespace
	const Dotrace = typeof require == "undefined" 
		? (ns => (self.Dotrace ? self.Dotrace : (self.Dotrace = ns, ns)))({}) //for window or worker
		: exports;//for Node
	
	//Joined dots mode
	{
		//vector functions
		//x(15)y(15)d(2)
		const direcs = {e:0, s:1, w:2, n:3};
		const xshift = 17, yshift = 2;
		const ymask = 0b11111111111111100, dmask = 0b11;
		const joinXYD = (x, y, d) => x << xshift | y << yshift | d;
		const splitXYD = v => [v >>> xshift, (v & ymask) >>> yshift, v & dmask];
		const toNext = (x, y, d, nd) => {
			switch(d){
				case direcs.e: x++; break;
				case direcs.s: y++; break;
				case direcs.w: x--; break;
				case direcs.n: y--; break;
			}
			return joinXYD(x, y, nd);
		};
		const toReverse = (x, y, d) => toNext(x, y, d, (d + 2) & 3);
		
		//assort vectors by color
		const assortVectors = (arr, w, h) => {
			const result = new Map();
			for(let y = 0; y < h; y++){
				for(let x = 0; x < w; x++){
					const color = arr[x + y * w];
					//transparent black has no paint area
					if(color == 0){continue;}
					const vectors = result.has(color) 
						? result.get(color) 
						: (set => (result.set(color, set), set))(new Set()); 
					pushVectorsWrapPixel(vectors, x, y);
				}
			}
			return result;
		};
		const pushVectorsWrapPixel = (vectors, x, y) => {
			//clockwise
			pushVector(vectors, x    , y    , direcs.e);
			pushVector(vectors, x + 1, y    , direcs.s);
			pushVector(vectors, x + 1, y + 1, direcs.w);
			pushVector(vectors, x    , y + 1, direcs.n);
		};
		const pushVector = (vectors, x, y, d) => {
			//cancel reverse vector
			const rev =  toReverse(x, y, d);
			vectors.has(rev) 
				? vectors.delete(rev) 
				: vectors.add(joinXYD(x, y, d));
		};

		//convert vectors to path string
		const header = ["h", "v", "h-", "v-"];
		const toPath = vectors => {
			let result = "", path = "";
			let startx = 0, starty = 0;
			let x = 0, y = 0, d = 0;
			let dx = 0, dy = 0;
			let nx = 0, ny = 0, nd = 0;
			let len = 0;
			for(let vector of vectors.values()){
				if(!vectors.has(vector)){return;}
				vectors.delete(vector);
				path = "";
				[x, y, d] = splitXYD(vector);
				[dx, dy] = [x - startx, y - starty];
				path += `m${x - startx}${dy >= 0 ? ",": ""}${y - starty}`;
				[startx, starty] = [x, y];
				len = 1;
				for(;;){
					const next = findNext(vectors, x, y, d);
					if(next === undefined){
						path += "z";
						result += path;
						break;
					}
					vectors.delete(next);
					[nx, ny, nd] = splitXYD(next);
					if(d == nd){
						len++;
					}else{
						path += `${header[d]}${len}`;
						len = 1;
					}
					[x, y, d] = [nx, ny, nd];
				}
			}
			return result;
		};
		const findNext = (vectors, x, y, d) => {
			//search vectors order by anti clockwise.
			for(let i = 0; i > -4; i--){
				if(i == 1){continue;}
				const next = toNext(x, y, d, (d + i) & 3);
				if(vectors.has(next)){
					return next;
				}
			}
		};

		//trace pixel art
		Dotrace.trace = (data, w, h) => 
			convert(data, w, h, assortVectors, toPath);
	}
	
	//shaped dots mode
	{
		const assortPixels = (arr, w, h) => {
			const result = new Map();
			for(let y = 0; y < h; y++){
				for(let x = 0; x < w; x++){
					const color = arr[x + y * w];
					if(color == 0){continue;}
					const pixels = result.has(color) 
						? result.get(color) 
						: (set => (result.set(color, set), set))(new Set()); 
					pixels.add([x, y]);
				}
			}
			return result;
		};
		const toPath = (pixels, shape = "h1v1h-1z") => {
			let path = "";
			for(let pixel of pixels.values()){
				const [x, y] = pixel;
				path += `M${x},${y}${shape}`;
			}
			return path;
		};
		//replace square dot to shaped dot
		Dotrace.dotToShape = (data, w, h, shape) => 
			convert(data, w, h, assortPixels, pixels => toPath(pixels, shape));
	}

	const convert = (data, w, h, toColorMap, toPath) => {
		const arr = new Uint32Array(data.buffer);
		const colors = toColorMap(arr, w, h);
		const result = new Map();
		for(let [color, vectors] of colors){
			result.set(color, toPath(vectors));
		}
		return result;
	};
	
	{
		Dotrace.toSVG = (data, w, h, s = 1, shape, useDTD) => {
			let dtd = "";
			if(!!shape && useDTD){
				dtd = `<?xml version="1.0" standalone="yes"?>
<!DOCTYPE svg[<!ENTITY s "${shape}">]>
`;
				shape = "&s;";
			}
			const tracer = !shape ? Dotrace.trace : (data, w, h) => Dotrace.dotToShape(data, w, h, shape);
			const rgbdata = new Uint8Array(data.length);
			const adata = new Uint8Array(data.length);
			rgbdata.fill(255);
			adata.fill(255);
			let needMask = false;
			for(let y = 0; y < h; y++){
				for(let x = 0; x < w; x++){
					const p = (x + y * w) * 4;
					const [r, g, b, a] = [data[p], data[p + 1], data[p + 2], data[p + 3]];
					if(a == 0){
						rgbdata[p] = rgbdata[p + 1] = rgbdata[p + 2] = rgbdata[p + 3] 
						= adata[p] = adata[p + 1] = adata[p + 2] = adata[p + 3] = 0;
					}else{
						rgbdata[p    ] = r;
						rgbdata[p + 1] = g;
						rgbdata[p + 2] = b;
						adata[p + 3] = a;
					}
					if(0 < a && a < 255){needMask = true;}
				}
			}

			let rgbpathstr = "";
			for(let [color, path] of tracer(rgbdata, w, h)){
				rgbpathstr += `<path fill="${Dotrace.formatColor(color)}" d="${path}"/>
	`;
			}
			let apathstr = "", maskstr = "";
			if(needMask){
				for(let [color, path] of tracer(adata, w, h)){
					apathstr += `<path opacity="${Dotrace.opacity(color)}" d="${path}"/>
		`;
				}
				maskstr = `<mask id="m" fill="#fff">
${apathstr}</mask>
`;
			}
			return `${dtd}<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w * s}px" height="${h * s}px">
<defs>
<g id="d"${needMask ? ' mask="url(#m)"' : ""}>
${rgbpathstr}</g>
${maskstr}</defs>
<use xlink:href="#d"/>
</svg>`;
		};

		{
			//positions of agba in color
			const shifts = [0, 8, 16, 24];
			//color(agbr) to array(r,g,b,a)
			Dotrace.splitColor = color => 
				shifts.map(shift => (color >>> shift) & 255);
			const unit = 0x11;
			Dotrace.formatColor = color => {
				const [r, g, b] = Dotrace.splitColor(color);
				const hex = r % unit == 0 && g % unit == 0 && b % unit == 0 
					? ((r / unit) << 8 | (g / unit) << 4 | (b / unit)).toString(16).padStart(3, "0")
					: (r << 16 | g << 8 | b).toString(16).padStart(6, "0");
				return "#" + hex;
			};
			Dotrace.opacity = color => Math.round((color >>> shifts[3])/255 * 1000)/1000;
		}
		
		//color of transparent pixel to transparent black(ie. 255,128,192,0 to 0,0,0,0)
		//NOTE:default behavior of canvas element.(for Jimp)
		Dotrace.normalizePixel = data => {
			const arr = new Uint32Array(data.buffer);
			return new Uint8Array((arr.map((val, i) => (val & 0xff000000) == 0 ? 0 : val)).buffer);
		};
		
		//dot shapes for shaped dots mode
		Dotrace.shapes = {
			dia: "m.5 0 .5.5-.5.5-.5-.5z",
			circle: "m0 .5a.5.5 0 1 1 1 0 .5.5 0 1 1-1 0z",
			topleft: "m0 1v-1h1z",
			topright: "h1v1z",
			bottomleft: "v1h1z",
			bottomright: "m0 1h1v-1z"
		};
	}
}
