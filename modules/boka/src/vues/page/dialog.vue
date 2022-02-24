<!-- includes a page into a dialog, splitting the level 2 sections in tabs, if any -->
<template>
  <div class="modal is-active">
    <div @click="close" class="modal-background"></div>
    <div class="modal-card page-dialog" :data-page="katonoma(referent)">
      <header class="modal-card-head">
        <p class="modal-card-title" v-html="title" />
        <button class="control button is-primary" aria-label="close" @click="close">
          <span class="icon close"></span>
        </button>
      </header>
      <section class="modal-card-body">
        <div v-if="tabs.length > 0">
          <div class="tabs">
            <ul>
              <li v-for="(tab, index) in tabs" :key="`info-${index}`" :class="{ 'is-active': index === position }">
                <a @click="position = index"
                  ><span :class="`icon ${tab.toLowerCase()}`"></span><span class="label">{{ tab }}</span></a
                >
              </li>
            </ul>
          </div>
          <section class="tabbed content" v-html="sections[position]"></section>
        </div>
        <player v-else :referent="referent" :text="removeTitle(body)" :template="resolve('default')" class="content"></player>
      </section>
      <footer class="modal-card-foot"></footer>
    </div>
  </div>
</template>

<script lang="ts">
import mousetrap from "mousetrap";
import { Component, Prop, Vue } from "vue-property-decorator";

import sam from "@babouk/sam";
import zevir from "@babouk/zevir";

import { Page, resolve, View } from "@babouk/model";

import player from "../player.vue";

import utils from "../utils.js";

@Component({
  components: { player, zevir },
  mixins: [utils],
})
export default class PageDialog extends Vue {
  title: string = "Information";
  tabs = new Array<string>();
  sections = new Array<string>();
  position = 0; // current active tab

  referent = resolve("");
  body = "";

  close(): void {
    this.$emit("close");
  }
  mounted() {
    const that = this;
    if (this.$store.state.dialog.parameters !== undefined && this.$store.state.dialog.parameters.length > 0) {
      const parameters = this.$store.state.dialog.parameters;
      if (parameters !== undefined) {
        this.referent = this.resolve(parameters[0]);
        sam
          .getPage(this.referent)
          .then((p: Page) => {
            const text = this.removeTitle(p.body);
            const array = text.split(/(^## .*$)/m);
            if (array.length > 1) {
              // if there are level 2 headings, turn them into tabs
              // shift is used to remove the first element of the array, which contains everything until the separator is found, which is expected to be empty
              array.shift();
              this.tabs = array.filter((item) => item.startsWith("##")).map((item) => item.replace("## ", ""));
              this.sections = array.filter((item) => !item.startsWith("##")).map((item, index) => zevir.htmlizeSync("## " + this.tabs[index] + "\n\n" + item));
              // Compute active position, if any tab name was given
              if (parameters.length > 1 && parameters[1] !== undefined) {
                const index = this.tabs.indexOf(parameters[1]);
                this.position = index >= 0 ? index : 0;
              }
            } else {
              // otherwise, use the content as such
              this.body = array[0];
              // Hack for centering map on specific marker
              console.log("parameters", parameters);
              if (parameters.length > 1 && parameters[1] !== undefined) {
                this.$store.commit("properties", { center: parameters[1], zoom: 3, popup: true });
              }
            }
          })
          .catch((err: Error) => console.log(err));
      }
      // value = zevir.htmlizeSync(value);
      // this.content += `<h2>${this.capitalize(key)}</h2>\n<section>${value}</section>\n`;
    }
    mousetrap.bind("esc", this.close);
  }
  beforeDestroy(): void {
    mousetrap.unbind("esc");
  }

  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
</script>
