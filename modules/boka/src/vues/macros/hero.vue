<template>
  <section class="hero is-primary">
    <img :src="image.url"/>
    <div class="hero-body">
      <div class="container">
        <h1 class="title" v-html="title"></h1>
        <h2 class="subtitle" v-html="subtitle"></h2>
        <div class="field is-grouped">
          <button v-for="field in fields" :key="field.id" :title="$t(field.id)" :class="getButtonClass(field.id)" @click="emit(...field.intent, data[field.id])">
            <span class="icon">
              {{ field.id.substring(0, 1).toUpperCase() }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";

import zevir from "@babouk/zevir";

import utils from "../utils.js";
import bus from "../../main/bus";

// ::: hero
// subtitle: 'Un passage en tranquillité'
// img: 9ae4d3539bc3de5a0672d8cf50f80f538682a585.jpg@le-montparnasse-des-artistes
// :::

// https://en.wikipedia.org/wiki/Hero_image

@Component({
  mixins: [utils],
  components: {},
})
export default class Hero extends Vue {
  title: string = "";
  subtitle: string = "";
  image: any = {};
  id: string = "header-" + Math.floor(Math.random() * Math.floor(100));
  fields: any[] = [{ id: "info", event: ["open-dialog", "info"] }];
  // { id: "audio", type: "audio", file: "audio.pm3", event: ["open-dialog", "open"] },
  data: any = "";

  getBackground(image: any): string {
    if (image === undefined) return "";
    // img@page
    const url = image.replace(/([^@]*)@(.*)/g, "$2/media/$1");
    return `background-image: url('${url}');`;
  }

  getButtonClass(id: string): string {
    return `control button is-primary ${id}`;
  }

  emit(eventName: string, ...args: any): void {
    console.log(eventName, ...args);
    bus.$emit(eventName, ...args);
  }

  mounted(): void {
    this.title = zevir.htmlizeSync(this.$store.state.view.page.label);
    const data = this.parseNodeBody();
    if (data !== undefined) {
      this.subtitle = data.subtitle;
      this.image = this.toMedia(data.image);
      this.data = data;
    }
    //this.relations = data.relations;
  }
}
</script>
<style>
.hero {
  margin-bottom: 1rem;
  background-size: cover;
}
.hero-body .container {
  padding: 1rem;
  background-color: #2222225c;
  text-align: center !important;
}

.hero-body .container .field.is-grouped {
  justify-content: center;
}
</style>
