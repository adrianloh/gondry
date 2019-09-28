<template>
	<div class="construct" :id="id" :style="{zIndex:zindex}" @mousedown="bringToFront">
		<div ref="handle" class="handle" @mousedown="bringToFront">
			<span class="title">CONSTRUCT</span>
			<span class="closeminimize" @click="destroy">X</span>
		</div>
		<div class="controls">
			<div class="controllayer">
				T
				<input v-model.number="T">
				<span class="tc">TCG {{ TCG }}</span>
				<span class="tc">TCR {{ TCR }}</span>
				&nbsp;&nbsp;Z
				<select v-model.number="zoom">
					<option>25</option>
					<option>75</option>
					<option>125</option>
					<option>200</option>
					<option>250</option>
					<option>750</option>
					<option>1500</option>
				</select>
				<span
					class="toggle"
					:class="{tactive:timelineMode}"
					@click="timelineMode = !timelineMode"
				>timeline</span>
				<span class="toggle" :class="{tactive:loop}" @click="loop = !loop">loop</span>
				<span
					class="toggle"
					:class="{tactive:playthrough}"
					@click="playthrough = !playthrough"
				>playthrough</span>
				active: {{ active }}
			</div>
		</div>
		<div class="container" :class="{timelinecontainer: timelineMode}">
			<div :class="{timeline: timelineMode}">
				<draggable
					v-model="clips"
					:clone="drag"
					:group="{ name: 'clips', pull: 'clone', put: true }"
					ghost-class="ghost"
					@end="dragended"
				>
					<Filmstrip
						v-for="(clip, i) in clips"
						:key="clip.uuid"
						:uuid="clip.uuid"
						:index="i"
						:z="zoom"
						:mode="mode"
						:ii="clip.ii"
						:oo="clip.oo"
						:trt="clip.trt"
						:fps="clip.fps"
						:url="clip.url"
						:width="clip.width"
						:active="active"
						@play="getTC"
						@activate="setActive"
						@playbackstopped="playNextClip"
						@durationchange="setDuration"
						@markerchange="setMarker"
						@registerplaypause="registerplaypause"
					/>
				</draggable>
			</div>
		</div>
	</div>
</template>

<script>
import Vue from "vue";
import Filmstrip from "./Filmstrip";
import { MODE, uuidv4, timecode } from "../structs";
import draggable from "vuedraggable";
import EventBus from "../eventbus";
import displace from "displacejs";

function clone(o) {
	return JSON.parse(JSON.stringify(o));
}

function Sorted(a, b) {
	if (a < b) return -1;
	if (a > b) return 1;
	else return 0;
}

export default Vue.extend({
	name: "Construct",
	props: ["id", "initialclips"],
	components: {
		Filmstrip,
		draggable
	},
	data() {
		return {
			FPS: 25,
			timelineMode: false,
			zoom: 75,
			T: 0,
			active: -1,
			masterclips: {},
			TCR: timecode(0, this.FPS),
			playthrough: false,
			loop: true,
			draggedClipId: "",
			zindex: 0
		};
	},
	beforeMount() {
		this.playpause = {};
	},
	mounted() {
		EventBus.$on(
			this.id,
			function(e) {
				this[e.method](...e.args);
			}.bind(this)
		);
		displace(this.$el, {
			constrain: false,
			handle: this.$refs.handle
		});
		this.bringToFront();
		this.initialclips.forEach(
			function(c, i) {
				c = this.initClip(c);
				c.index = i;
				this.$set(this.masterclips, c.uuid, c);
			}.bind(this)
		);
	},
	watch: {},
	computed: {
		clips: {
			get() {
				let self = this;
				return Object.values(this.masterclips)
					.sort((a, b) => {
						return a.index - b.index;
					})
					.filter(c => {
						if (self.timelineMode) {
							return c.ii >= 0 || c.oo >= 0;
						}
						return true;
					});
			},
			set(clipsInNewOrder) {
				let self = this;
				if (Object.keys(self.masterclips).length === clipsInNewOrder.length) {
					clipsInNewOrder.forEach(function(c, i) {
						if (self.masterclips.hasOwnProperty(c.uuid)) {
							self.masterclips[c.uuid].index = i;
						}
					});
				} else {
					// We are getting a filtered list
					let uuids = clipsInNewOrder.map(c => {
						return c.uuid;
					});
					let indexes = Object.values(self.masterclips).reduce((s, c) => {
						if (uuids.indexOf(c.uuid) !== -1) {
							s.push(c.index);
						}
						return s;
					}, []);
					if (uuids.length !== indexes.length) {
						console.log("Failed set: ", uuids, indexes);
						return;
					}
					indexes.sort(Sorted);
					clipsInNewOrder.forEach((c, i) => {
						let o = self.masterclips[c.uuid];
						o.index = indexes[i];
						self.$set(self.masterclips, c.uuid, o);
					});
				}
			}
		},
		TCG: {
			get() {
				return timecode(this.T, this.FPS);
			}
		},
		mode: {
			get() {
				if (this.timelineMode) {
					return MODE.TIMELINE;
				} else {
					return MODE.CONSTRUCT;
				}
			}
		}
	},
	methods: {
		initClip(c) {
			let nc = new c.__proto__.constructor();
			nc.uuid = uuidv4();
			nc.duration = c.trt;
			nc.index = 0;
			nc.ii = -1;
			nc.oo = -1;
			return nc;
		},
		copyclip(c, newIndex) {
			let nc = this.initClip(c);
			nc.ii = c.ii;
			nc.oo = c.oo;
			nc.duration = c.duration;
			nc.index = newIndex;
			this.clips.forEach(cl => {
				if (cl.index >= newIndex) {
					cl.index += 1;
				}
			});
			this.$set(this.masterclips, nc.uuid, nc);
		},
		display(clip) {
			if (this.timelineMode) {
				return clip.ii >= 0 || clip.oo >= 0;
			}
			return true;
		},
		getClips() {
			// TODO: Get rid of this coupling
			return this.$children[0].$children;
		},
		drag(o) {
			this.draggedClipId = o.uuid;
		},
		dragended(e) {
			let srcContruct = e.from.offsetParent.id,
				destConstruct = e.to.offsetParent.id;
			if (srcContruct !== destConstruct) {
				let clip = this.masterclips[this.draggedClipId];
				EventBus.$emit(destConstruct, {
					method: "copyclip",
					args: [clip, e.newIndex]
				});
				console.log(e);
			}
		},
		getTC(o) {
			let tc = o.t,
				filmstrips = this.getClips();
			filmstrips.slice(0, o.i).forEach(c => {
				tc += c.duration + 1;
			});
			this.T = tc;
			this.TCR = o.tc;
		},
		playNextClip(o) {
			let frameclips = this.clips,
				nextIndex = o.i + 1,
				nextClip,
				t;
			if (nextIndex >= frameclips.length) {
				if (this.loop) {
					if (this.timelineMode) {
						nextIndex = 0;
						nextClip = frameclips[nextIndex];
						t = -1;
					} else {
						nextIndex = o.i;
						nextClip = frameclips[nextIndex];
						t = 0;
					}
				} else {
					return;
				}
			} else {
				if (this.timelineMode) {
					nextIndex = o.i + 1;
					nextClip = frameclips[nextIndex];
					t = -1;
				} else {
					if (this.playthrough) {
						nextIndex = o.i + 1;
					} else if (this.loop) {
						nextIndex = o.i;
					} else {
						return;
					}
					t = 0;
					nextClip = frameclips[nextIndex];
				}
			}
			this.playpause[nextClip.uuid](t);
			this.active = nextIndex;
		},
		setActive(o) {
			if (o.active) {
				this.active = o.i;
			} else if (o.i === this.active && !this.timelineMode) {
				this.active = -1;
			}
		},
		setDuration(o) {
			this.masterclips[o.uuid].duration = o.duration;
		},
		setMarker(o) {
			this.masterclips[o.uuid][o.marker] = o.t;
		},
		registerplaypause(o) {
			this.playpause[o.uuid] = o.func;
		},
		bringToFront() {
			this.zindex = window.zindex += 1;
		},
		destroy() {
			this.$emit("constructevent", {
				method: "destroyConstruct",
				args: [this.id]
			});
		}
	}
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css?family=Orbitron|Nanum+Gothic+Coding|Teko|Nova+Mono|Lexend+Giga&display=swap");

.construct {
	font-family: "Orbitron", Courier, monospace;
	font-size: 12pt;
	font-smoothing: antialiased;
	-webkit-transform: translate3d(0, 0, 0);
	background-color: #2e2e2e;
	resize: both;
	width: 1000px;
	height: 800px;
	overflow: hidden;
	padding: 0 10px 80px 0;
	border: 10px solid #25253d;
	transform: translate3d(0, 0, 0);
	perspective: 1000;
	backface-visibility: hidden;
	user-select: none;
}

.construct::-webkit-scrollbar-track {
	-webkit-box-shadow: inset 0 0 6px rgb(81, 72, 112);
	background-color: #F5F5F5;
}

.construct::-webkit-scrollbar {
	width: 6px;
	background-color: #F5F5F5;
}

.construct::-webkit-scrollbar-thumb {
	background-color: #707070;
}

.handle {
	height: 24px;
	color: white;
	background: #3a3a5f;
	cursor: grabbing;
	width: 101%;
}

.handle > .closeminimize {
	right: 0;
	position: absolute;
	cursor: pointer;
}

.controls {
	background: #25253d;
	top: 0;
	color: white;
	height: 33px;
	padding-left: 20px;
	padding-top: 8px;
	width: 101%;
}

.controllayer {
	margin: 0;
	padding: 0;
}

.controllayer > input {
	width: 5em;
}

.container {
	width: auto;
	height: inherit;
	overflow: auto;
	padding-left: 10px;
	padding-right: 10px;
}

.container::-webkit-scrollbar-track {
	background-color: rgb(218, 218, 218);
}

.container::-webkit-scrollbar {
	width: 6px;
	background-color: rgb(228, 228, 228);
}

.container::-webkit-scrollbar-thumb {
	background-color: #4c4c85;
}

.timelinecontainer {
	overflow-x: auto;
	padding-bottom: 25%;
	padding-top: 25%;
}

.timeline {
	width: max-content;
}

.ghost {
	opacity: 0.5;
	background-color: yellow;
}

span.tc {
	font-family: "Nanum Gothic Coding", monospace;
	font-size: 12pt;
	margin-left: 1em;
	color: #7c7cb4;
}

.toggle {
	padding: 0;
	margin: 0 0 0 10px;
	cursor: pointer;
}

.tactive {
	color: #ffc400;
}
</style>