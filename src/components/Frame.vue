<script>
import Vue from "vue";
import { MODE, random_rgba } from "../structs";

const PLAYHEAD = "#ffff00";
const MARKER_IN = "#00ff40";
const MARKER_OUT = "#ff0026";
const BLACK = "#000";

export default Vue.extend({
	name: "Frame",
	props: ["framedata", "T", "ii", "oo", "mode", "active", "getURL"],
	data() {
		return {
			p: 0,
			baseWidth: 160,
			pbWidth: 3,
			bgColor: "#000"
		};
	},
	beforeMount() {
		this.bgColor = random_rgba();
	},
	computed: {
		isTimeline: {
			get() {
				return this.mode === MODE.TIMELINE;
			}
		},
		trt: {
			get() {
				return this.framedata.sd;
			}
		},
		width: {
			get() {
				return this.framedata.width;
			}
		},
		style: {
			get() {
				let w = `${this.width}px`,
					backgrounds = [],
					s = 0; // See: https://ascii.cl/conversion.htm

				// Get in-out lines. If we are in timelineMode -- don't show them
				if (!this.isTimeline && this.inRangeOf(this.ii)) {
					backgrounds.push(this.line(MARKER_IN, this.P(this.ii)));
					s = s | 1;
				}
				if (!this.isTimeline && this.inRangeOf(this.oo)) {
					backgrounds.push(this.line(MARKER_OUT, this.P(this.oo)));
					s = s | 2;
				}
				// Get the playhead line -- if we are active
				if (this.active && this.inRangeOf(this.T)) {
					backgrounds.push(this.line(PLAYHEAD, this.P(this.T)));
					s = s | 4;
				}
				switch (true) {
					case (s & 4) === 4: // Them mouse in skimming
						backgrounds.push(this.thumbnail(this.T));
						for (let i = 1; i < 20; i++) {
							backgrounds.push(this.thumbnail(this.T - i)); // Hack to alleviate flickering
							backgrounds.push(this.thumbnail(this.T + i)); // Hack to alleviate flickering
						}
						break;
					case (s & 1) === 1: // If we contain the Mark In frame, show it
						backgrounds.push(this.thumbnail(this.ii));
						break;
					case (s & 2) === 2: // If we contain the Mark Out frame, show it
						backgrounds.push(this.thumbnail(this.oo));
						break;
					default:
						// Show the first frame of this segment
						backgrounds.push(this.thumbnail(this.framedata.st));
				}
				backgrounds.push(BLACK);
				return {
					width: w,
					background: backgrounds.join(",")
				};
			}
		},
		_style: {
			// Disable thumbnails and just use bgColor
			get() {
				let w = `${this.width}px`;
				return {
					width: w,
					background: `${this.line(PLAYHEAD, this.P(this.T))},${this.bgColor}`
				};
			}
		}
	},
	methods: {
		inRangeOf(t) {
			if (t === this.framedata.lt) {
				// This is the last segment and T is on the last frame
				return true;
			}
			if (this.framedata.st === this.framedata.cst && this.framedata.st === t) {
				// This is the first segment and T is on the first frame
				return true;
			}
			return t > this.framedata.st && t < this.framedata.lt;
		},
		P(t) {
			// Position of `t` along x-axis of this segment
			return (100 * (t - this.framedata.st)) / this.trt;
		},
		thumbnail(t) {
			t = t < 0 ? 0 : t;
			return `url(${this.getURL(t)}) left center / cover`;
		},
		line(color, pos) {
			// Return a vertical bar
			return `linear-gradient(${color}, ${color}) no-repeat ${pos}% center/${
				this.pbWidth
			}px 100%`;
		},
		mousemove(e) {
			// Send to parent the current frame of where the mouse is
			this.p = fractionalOffset(e.offsetX, this.width);
			let t = this.framedata.st + this.p * this.trt;
			this.$emit("mousemove", Math.round(t));
		},
		mousedown(e) {
			this.$emit("mousedown");
		},
		mouseup(e) {
			this.$emit("mouseup");
		}
	},
	template: `
		<li class="frame" :class="{timeline: isTimeline}" :style="style"
			@mousemove="mousemove" 
			@mousedown.left.prevent="mousedown" 
			@mouseup.left.prevent="mouseup" >
			{{T}}
		</li>
	`
});

function fractionalOffset(offset, width) {
	let x = offset < 0 ? 0 : offset,
		w = x / width;
	w = w > 1 ? 1 : w;
	return w;
}
</script>

<style scoped>
.frame {
	display: inline-block;
	vertical-align: bottom;
	height: 90px;
	margin: 0 0 5px 0;
	padding: 0;
	overflow: hidden;
	color: #fff;
	cursor: w-resize;
	user-select: none;
}

.frame.timeline:first-child {
	border-left: 1px solid black;
}

.frame.timeline:last-child {
	border-right: 1px solid black;
}

.frame:first-child {
	border-left: 10px solid #2e2e2e;
}

.frame:last-child {
	border-right: 10px solid #2e2e2e;
}
</style>