// Passed from Container -> Filmstrip
export class ClipData {
	constructor(name, trt, fps, url) {
		this.name = name;
		this.trt = trt;
		this.fps = fps;
		this.url = url;
		return this;
	}
}

// Passed from Filmstrip -> Frame
export class FrameData {
	constructor(segmentFirstFrame, segmentDuration, clipFirstFrame, segmentLastFrame, segmentWidth) {
		this.st = segmentFirstFrame;
		this.sd = segmentDuration;
		this.cst = clipFirstFrame;
		this.lt = segmentLastFrame;
		this.width = segmentWidth;
		return this;
	}
}

export const MODE = {
	CONSTRUCT: 0,
	TIMELINE: 1
};

export function uuidv4() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export function random_rgba() {
	var o = Math.round,
		r = Math.random,
		s = 255;
	return "rgba(" + o(r() * s) + "," + o(r() * s) + "," + o(r() * s) + "," + "0.2" + ")";
}

export function timecode(T, fps) {
	if (T <= 0) {
		return "00:00:00:00";
	}
	fps = Math.ceil(fps);
	let seconds = Math.floor(T / fps),
		frames = T % fps;
	return `${hhmmss(seconds)}:${pad(frames)}`;
}

function pad(num) {
	return ("0" + num).slice(-2);
}

function hhmmss(secs) {
	var minutes = Math.floor(secs / 60);
	secs = secs % 60;
	var hours = Math.floor(minutes / 60);
	minutes = minutes % 60;
	return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}
