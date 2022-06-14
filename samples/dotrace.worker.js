"use strict";
importScripts("../dotrace.core.js");
{
	self.onmessage = e => {
		const d = e.data;
		self.postMessage(Dotrace.toSVG(d.data, d.w, d.h));
	};
}
