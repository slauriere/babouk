<template>
  <a
    class="control button"
    @click="data.intent !== undefined ? emit(...data.intent) : {}"
    :href="getHref()"
    :aria-label="data.intent ? data.intent[0] : 'no intent'"
    v-on:click.prevent
  >
    <span v-if="data.url && (data.layout === undefined || data.layout === 'icon-left')" class="icon"
      ><img :src="data.url" :alt="data.intent ? data.intent[0] : 'no intent'"
    /></span>
    <span v-if="data.label" class="label" v-html="data.label" />
    <span v-if="data.url && (data.layout === 'icon-right')" class="icon"
      ><img :src="data.url" :alt="data.intent ? data.intent[0] : 'no intent'"
    /></span>
  </a>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import sam from "@babouk/sam";
import zevir from "@babouk/zevir";

import utils from "../utils.js";
import bus from "../../main/bus";

@Component({
  name: "xbutton",
  mixins: [utils],
})
export default class Button extends Vue {
  data: any = {};

  mounted() {
    this.data = this.parseNodeBody();
    Object.assign(this.data, this.toMedia(this.data.image));
  }

  getHref(): string {
    const intent = this.data.intent;
    if (intent !== undefined && intent.length == 2) {
      return intent[1];
    }
    return "";
  }

  // open(cell: any): void {
  //   this.emit("page-open", this.resolve(cell.link));
  // }
}
</script>
