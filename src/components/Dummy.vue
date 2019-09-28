<script>
import Vue from "vue";

export default Vue.extend({
	name: "Dummy",
	props: ["z"],
	components: {},
	data() {
		return {
			t: 0
		};
	},
	computed: {
		n: {
			get() {
				return this.t * 10;
			}
		}
	},
	methods: {
		scrub(t) {
			this.t += 1;
		}
	},
	beforeMount() {
		this.t = this.z;
	},
	template: `
	<div>{{t}}
	</div>
	`
});
</script>

<style scoped>
</style>