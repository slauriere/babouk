<!-- image -->
<template>
  <figure>
    <TwentyTwenty v-if="images.length == 2" :before="images[0].url" :after="images[1].url" />
  </figure>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";

import "vue-twentytwenty/dist/vue-twentytwenty.css";
import TwentyTwenty from "vue-twentytwenty";

import bus from "../../main/bus";
import utils from "../utils.js";

@Component({
  components: {
    TwentyTwenty,
  },
  mixins: [utils],
})
export default class jxta extends Vue {
  images = new Array<any>();
  mounted(): void {
    const data = this.parseNodeBody();
    if (data.images !== undefined && data.images.length == 2) {
      console.log(data);
      this.images = data.images.map((image: string) => this.toMedia(image));
    }
  }
}
</script>
