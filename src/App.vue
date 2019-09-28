<script>
import Construct from "./components/Construct";
import { MODE, uuidv4 } from "./structs";

const ROOT = "http://localhost:8080/images";
// "https://ragnarok-framestore.s3.ap-southeast-1.amazonaws.com/pond5/images";
const manifestFile = `${ROOT}/manifest.json`;

export default {
	name: "App",
	components: {
		Construct
	},
	data() {
		return {
			library: {},
			constructs: {}
		};
	},
	created() {
		window.zindex = 0;
	},
	async beforeMount() {
		let response = await fetch(manifestFile);
		let data = await response.json();
		let self = this;
		Object.keys(data).forEach(id => {
			let info = data[id];
			function ClipData() {}
			ClipData.prototype.id = id;
			ClipData.prototype.name = info.format.filename.split("/").slice(1)[0];
			ClipData.prototype.trt = parseInt(info.streams[0].nb_frames, 10);
			ClipData.prototype.fps = eval(info.streams[0].r_frame_rate);
			ClipData.prototype.url = `${ROOT}/${id}`;
			ClipData.prototype.width = 160;
			ClipData.prototype.height = 90;
			ClipData.prototype.ffprobe = info;
			self.$set(self.library, id, new ClipData());
		});
	},
	mounted() {},
	computed: {
		clips: {
			get() {
				// In development, we are only taking a subset
				let self = this,
					randomIds = getRandomSubset(Object.keys(self.library), 20);
				return randomIds.map(id => {
					return self.library[id];
				});
			}
		}
	},
	methods: {
		newConstruct(clips) {
			let C = { id: this.uuid() };
			if (Array.isArray(clips)) {
				C.clips = clips;
			} else {
				C.clips = [];
			}
			this.$set(this.constructs, C.id, C);
		},
		newLibrary() {
			this.newConstruct(this.clips);
		},
		destroyConstruct(id) {
			if (this.constructs.hasOwnProperty(id)) {
				this.$delete(this.constructs, id);
			}
		},
		handleConstructEvent(o) {
			this[o.method](...o.args);
		},
		uuid() {
			return uuidv4();
		}
	},
	template: `
	<div class="appBody">
		<div class="controls">
			<div class="button" @click="newLibrary">+ Library</div>
			<div class="button" @click="newConstruct">+ Empty</div>
		</div>
		<Construct v-for="(c, id) in constructs" :key="c.id" :id="c.id" :initialclips="c.clips" @constructevent="handleConstructEvent"/>
	</div>
	`
};

function getRandomSubset(arr, size) {
	var shuffled = arr.slice(0),
		i = arr.length,
		min = i - size,
		temp,
		index;
	while (i-- > min) {
		index = Math.floor((i + 1) * Math.random());
		temp = shuffled[index];
		shuffled[index] = shuffled[i];
		shuffled[i] = temp;
	}
	return shuffled.slice(min);
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css?family=Saira&display=swap");

.controls {
	font-family: "Saira";
	line-height: 27px;
	z-index: 100000000;
	position: absolute;
}

.controls > .button {
	width: 90px;
	height: 28px;
	border: 1px solid #929292;
	text-align: center;
	color: white;
	display: inline-block;
	background: #0083f66b;
	cursor: pointer;
}
</style>
