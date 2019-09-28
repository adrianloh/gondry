import { shallowMount } from "@vue/test-utils";
import Dummy from "../src/components/Dummy.vue";

let cmp;

beforeEach(() => {
	cmp = shallowMount(Dummy, {
		// Create a shallow instance of the component
		propsData: {
			z: 20
		}
	});
});

it("equals to 20", () => {
	// Within cmp.vm, we can access all Vue instance methods
	expect(cmp.vm.t).toEqual(20);
});
