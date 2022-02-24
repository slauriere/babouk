<template>
  <div v-if="!hasWebShareApi()" class="dropdown" :class="{ 'is-active': on }" v-click-outside="outside">
    <div class="dropdown-trigger" @click="on = !on">
      <button class="control button sharer" :class="getStyle()" aria-haspopup="true" aria-controls="dropdown-menu" aria-label="share">
        <span v-if="data.url" class="icon"><img :src="data.url" alt="share"/></span>
      </button>
    </div>
    <div class="dropdown-menu narrow narrow-square" role="menu">
      <div class="dropdown-content has-text-left">
        <share-network network="twitter" :url="getHref()" :title="getTitle()" class="control dropdown-item">
          <span class="icon twitter"></span>
        </share-network>
        <share-network network="facebook" :url="getHref()" :title="getTitle()" class="control dropdown-item">
          <span class="icon facebook"></span>
        </share-network>
        <share-network network="email" :url="getHref()" :title="getTitle()" class="control dropdown-item">
          <span class="icon email"></span>
        </share-network>
        <share-network network="whatsapp" :url="getHref()" :title="getTitle()" class="control dropdown-item">
          <span class="icon whatsapp"></span>
        </share-network>
      </div>
    </div>
  </div>
  <a
    v-else
    class="control button sharer"
    :class="getStyle()"
    @click="shareViaWebShare"
    :url="getHref()"
    :title="getTitle()"
    aria-label="share"
    v-on:click.prevent
  >
    <span v-if="data.url" class="icon"><img :src="data.url"/></span>
  </a>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import sharing from "vue-social-sharing";

import utils from "../utils.js";

Vue.use(sharing);

@Component({
  components: {},
  mixins: [utils],
})
export default class Sharer extends Vue {
  on: boolean = false;

  data: any = {};

  mounted() {
    this.data = this.parseNodeBody();
    Object.assign(this.data, this.toMedia(this.data.image));
  }

  outside() {
    this.on = false;
  }

  getHref(): string {
    return document.location.href;
  }

  getTitle(): string {
    return document.title;
  }

  // hack
  getStyle(): string {
    if (this.data.url !== undefined && this.data.url.indexOf("white") >= 0) {
      return "is-primary";
    } else {
      return "is-info is-light";
    }
  }

  hasWebShareApi(): any {
    return (navigator as any).share;
  }

  shareViaWebShare() {
    (navigator as any).share({
      title: this.getTitle(),
      url: this.getHref(),
    });
  }
}
</script>
