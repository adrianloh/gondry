<template>
	<div
		class="clip"
		:style="style"
		:class="{timeline:isTimeline}"
		@mouseenter="mouseover"
		@mouseleave="mouseout"
		@click.right.prevent="playpause"
	>
		<ul class="filmstrip">
			<span class="info">{{uuid.slice(0,5)}}</span>
			<Frame
				v-for="(framedata,i) in framesData"
				:key="i"
				:framedata="framedata"
				:T="T"
				:ii="ii"
				:oo="oo"
				:mode="mode"
				:active="isActive"
				:getURL="getURL"
				@mousemove="scrub"
				@mousedown="markIn"
				@mouseup="markOut"
			/>
		</ul>
	</div>
</template>

<script>
import Vue from "vue";
import Frame from "./Frame";
import { FrameData, MODE, random_rgba, timecode } from "../structs";

const NA = -1;

export default Vue.extend({
	name: "Filmstrip",
	props: [
		"index",
		"z",
		"ii",
		"oo",
		"uuid",
		"mode",
		"active",
		"trt",
		"fps",
		"url",
		"width"
	],
	components: {
		Frame
	},
	data() {
		return {
			T: NA,
			iii: NA,
			ooo: NA,
			frames: [],
			interval: null
		};
	},
	beforeMount() {
		for (let i = 0; i < this.trt; i++) {
			let url = `${this.url}.${i.toString().padStart(5, "0")}.webp`;
			this.frames.push(url);
		}
	},
	mounted() {
		this.$emit("registerplaypause", {
			uuid: this.uuid,
			func: this.playpause
		});
	},
	computed: {
		isTimeline: {
			get() {
				return this.mode === MODE.TIMELINE;
			}
		},
		style: {
			get() {
				if (this.isTimeline) {
					return {
						background: random_rgba()
					};
				} else {
					return {};
				}
			}
		},
		isPlaying: {
			get() {
				return this.interval != null;
			}
		},
		isActive: {
			get() {
				return this.active === this.index;
			}
		},
		zoom: {
			get() {
				if (this.z === 0) {
					return this.trt;
				} else {
					return this.z;
				}
			}
		},
		duration: {
			get() {
				let i = 0,
					o = this.trt;
				if (this.ii >= 0) {
					i = this.ii;
				}
				if (this.oo >= 0) {
					o = this.oo;
				}
				return o - i;
			}
		},
		first: {
			get() {
				if (this.isTimeline) {
					return this.ii < 0 ? 0 : this.ii;
				}
				return 0;
			}
		},
		last: {
			get() {
				if (this.isTimeline) {
					return this.oo < 0 ? this.trt : this.oo;
				}
				return this.trt;
			}
		},
		timecode: {
			get() {
				return timecode(this.T, this.fps);
			}
		},
		framesData: {
			get() {
				let ff = [];

				const cst = this.first; // first frame number of the whole clip
				const clt = this.last; // last frame number of the whole clip
				const sd = this.zoom; // Duration of each segment
				const w = this.width; // Width of each segment

				let st = cst;
				let r = clt;

				while (true) {
					if (r <= 0) {
						break;
					}
					let io = st + sd; // |st<-sd-->|
					if (io > clt) {
						let lsd = clt - st, // duration of last remaining segment
							lw = Math.ceil((lsd / sd) * w); // width of last remaining segment
						ff.push(new FrameData(st, lsd, cst, clt, lw));
						break;
					}
					ff.push(new FrameData(st, sd, cst, io, w));
					st = io;
					r -= sd;
				}

				return ff;
			}
		}
	},
	watch: {
		T(val) {
			let t = val - this.first;
			this.$emit("play", { i: this.index, t: t, tc: this.timecode });
		},
		active(val) {
			if (val !== this.index) {
				this.stopPlayback();
			}
		},
		duration(val) {
			this.$emit("durationchange", { uuid: this.uuid, duration: val });
		},
		iii(val) {
			this.$emit("markerchange", { uuid: this.uuid, marker: "ii", t: val });
		},
		ooo(val) {
			this.$emit("markerchange", { uuid: this.uuid, marker: "oo", t: val });
		}
	},
	methods: {
		scrub(t) {
			// Scrub to frame `T`, essentially, setting T
			if (!this.isPlaying) {
				this.T = t;
			}
		},
		stopPlayback() {
			clearInterval(this.interval);
			this.interval = null;
		},
		playpause(t) {
			if (typeof t === "number") {
				this.T = t === -1 ? this.ii : t;
			}
			if (this.isPlaying) {
				this.stopPlayback();
			} else {
				this.interval = setInterval(
					function() {
						if (this.T === this.last) {
							this.stopPlayback();
							this.$emit("playbackstopped", { i: this.index });
						} else {
							this.T += 1;
						}
					}.bind(this),
					1000 / Math.ceil(this.fps)
				);
			}
		},
		markIn() {
			// Set in marker to T
			this.iii = this.T;
		},
		markOut() {
			if (this.T < this.ii) {
				// Out marker is *before* in marker, swap
				this.ooo = this.iii;
				this.iii = this.T;
			} else if (this.T === this.ii) {
				// Out marker is the same as in marker, clear both marks
				this.iii = NA;
				this.ooo = NA;
			} else {
				// Set out marker to T
				this.ooo = this.T;
			}
		},
		mouseover() {
			this.$emit("activate", { i: this.index, active: true });
		},
		mouseout() {
			this.$emit("activate", { i: this.index, active: false });
		},
		getURL(t) {
			// Passed to `Frame`
			return this.frames[t];
		}
	}
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css?family=Nova+Mono&display=swap");

.clip {
	margin: 0;
	margin-bottom: 0.5em;
	width: fit-content;
	padding: 10px 20px 5px 10px;
	inline-size: auto;
	border: 1px solid rgb(109, 109, 109);
	cursor: n-resize;
}

.timeline {
	display: inline-block;
	vertical-align: bottom;
	margin: 0;
	padding: 20px 0 20px 0;
	cursor: move;
}

.filmstrip {
	padding: 0;
	margin: 0;
}

input {
	width: 5em;
}

.info {
	color: white;
	position: relative;
	margin-top: 30px;
	display: none;
}

span.tc {
	font-family: "Nova Mono", monospace;
}
</style>