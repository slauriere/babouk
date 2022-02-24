<!-- TODO: turn it to 'functional' component? -->
<template> </template>
<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";

import utils from "../utils.js";

@Component({
  name: "xstyle", // "style" is not allowed as a vue component name since it's already an HTML element
  mixins: [utils],
})
export default class Style extends Vue {
  mounted() {
    const data = this.parseNodeBody();
    if (data.reference !== undefined) {
      const ref = this.resolveMedia(data.reference);
      const url = this.serialize(ref);
      console.log('css url', url);
      this.registerStyle(url, true);
    }
  }
}
</script>
