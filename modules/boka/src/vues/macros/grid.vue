<template>
  <div class="grid columns is-multiline is-mobile">
    <div v-for="(cell, index) in cells" :class="getClass(cell, index)" :key="index">
      <!-- surround template with divs in case it contains multiple top-level elements -->
      <!-- <v-runtime-template v-if="cell.template !== undefined" :template="`<div>${cell.template}</div>`"></v-runtime-template> -->
      <!-- <div v-if="typeof cell === 'string'" v-html="cell"></div> -->
      <div v-if="!play && typeof cell === 'string'" v-html="htmlize(cell)"></div>
      <player v-else-if="play && typeof cell === 'string'" :text="cell" :template="resolve('default')" class="content"></player>
      <div v-else-if="cell.image === 'rien'" class="image" :src="cell.url" :style="getStyle(cell)"></div>
      <div v-else-if="cell.image === 'body' && cell.description != undefined" class="body" v-html="cell.description"></div>
      <figure v-else-if="cell.label !== undefined || cell.image !== undefined">
        <a
          v-if="cell.image !== undefined"
          @click="open(cell)"
          class="image-panel"
          v-on:click.prevent
          :aria-label="cell.link !== undefined ? cell.link : cell.url"
          :href="cell.link !== undefined ? cell.link : cell.url"
        >
          <!-- TODO: the aria-label should contain markdown text, not html -->
          <img class="image" :src="cell.url" :style="getStyle(cell)" :alt="cell.label" />
        </a>
        <a v-if="cell.label !== undefined && cell.link !== undefined" @click="open(cell)" class="caption-panel" v-on:click.prevent :href="cell.link">
          <figcaption v-html="cell.label"></figcaption>
        </a>
        <figcaption v-else-if="cell.label !== undefined" v-html="cell.label"></figcaption>
      </figure>
    </div>
  </div>
  <!--
    <wikji v-if="hasDialog" @close="hasDialog = false">
      <h3 slot="header">Wikji</h3>
    </wikji>
    -->
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import sam from "@babouk/sam";

import utils from "../utils.js";
import bus from "../../main/bus";

@Component({
  mixins: [utils],
  // https://vuejs.org/v2/guide/components-edge-cases.html#Circular-References-Between-Components
  // https://github.com/microsoft/TypeScript/issues/32679
  components: { player: () => import("../player.vue") },
})
export default class grid extends Vue {
  layout: string = "";
  background: string = "";
  slideIndex: number = -1;
  cells = new Array<any>();
  colspans: any = { mobile: 12, tablet: [6, 6] };
  colmax: number = 2; // highest number of columns in all modes (mobile, tablet, desktop), which is in theory the "real" number of columns
  play = false; // indicates whether a player should be mounted for each cell, or if the cell should simply get turned to html

  getBackgroundImageStyle(cell: any): string {
    if (cell.url !== undefined) {
      return `background-image: url(${cell.url});`;
    } else return "";
  }

  getSpan(index: number, mode: string): string {
    let span = undefined;
    let colspan = this.colspans[mode];
    // Use the mobile mode configuration in case the passed mode has no associated configuration
    if (colspan == undefined) colspan = this.colspans["mobile"];
    if (Array.isArray(colspan)) span = colspan[index % colspan.length];
    else span = colspan;
    if (span !== undefined) return `is-${span}-${mode}`;
    else return "";
  }

  getClass(cell: any, index: number): string {
    let clazz = `column ${this.getSpan(index, "mobile")} ${this.getSpan(index, "tablet")}`;
    if (index < this.colmax) clazz += " col-header";
    if (index % this.colmax === 0) clazz += " row-header";
    // TODO: check why link is sometimes function, it seems, not a string, when no "link" attribute is set
    if (cell.link !== undefined && typeof cell.link === "string") clazz += " " + this.toClassName(cell.link);
    clazz += " k-" + index;
    return clazz;
  }

  emit(eventName: string, ...args: any): void {
    bus.$emit(eventName, ...args);
  }

  getImages(): any[] {
    const filtered = this.cells.filter((cell) => cell.image !== undefined || cell.body !== undefined);
    return filtered;
  }

  mounted() {
    const slot = this.getSlotAsText();
    let cells = slot.split(/^-$/gm);
    let config: any = undefined;
    cells.forEach((cell: any, index) => {
      cell = cell.trim();
      // In case the first cell contains the string "spans:" or "media:", we consider it's a configuration
      if (index === 0 && (cell.indexOf("spans: ") >= 0 || cell.indexOf("media: ") >= 0)) {
        config = this.parse(cell);
        this.play = config.play !== undefined ? config.play : this.play;
      } else {
        if (config !== undefined && config.media === "yaml") {
          cell = this.parse(cell);
          if (cell.label !== undefined) {
            cell.label = this.htmlize(cell.label);
          }
          this.cells.push(cell);
        } else {
          this.cells.push(cell);
        }
      }
    });
    // Compute the column spans stored in the config
    if (config !== undefined) {
      this.colspans = config.spans || this.colspans;
      let maxFn = (max: number, cur: number) => Math.max(max, cur);
      this.colmax = Object.keys(this.colspans)
        .map((key) => this.colspans[key].length)
        .reduce(maxFn, -Infinity);
    }

    let galleridx = -1;

    if (config !== undefined) {
      if (config.media === "yaml") {
        this.cells.forEach((cell: any, index: number) => {
          if (cell.image !== undefined) {
            const obj = this.toMedia(cell.image);
            Object.assign(cell, obj);
          }
          if (cell.url !== undefined || cell.body !== undefined) {
            galleridx = galleridx + 1;
          }
          // An id is used in slideshow.vue for now, so let's have each cell hae one
          //cell.id = `${index}`;
          // Two indices: one is the real cell index in the set, the other one is its index in the slideshow, since only image cells are present in the slideshow.
          cell.index = index;
          cell.galleridx = galleridx;
        });
        // Retrieve caption dynamically for grids which have "captions: origin"
        if (config.captions === "origin") {
          let jobs = this.cells.map((cell: any) => {
            if (cell.url !== undefined && cell.reference !== undefined) return sam.getPage(cell.reference.set);
            // else {
            //   const body = cell.body ? cell.body : undefined;
            //   return Promise.resolve(new Page(resolve(cell.id, this.$store.state.sphere), "", body));
            // }
          });
          Promise.all(jobs).then((data) => {
            data.forEach((page: any, index: number) => {
              if (page !== undefined && page.body !== undefined) {
                //zevir.htmlize(page.body).then((output: any) => {
                this.cells[index].caption = page.body;
                //});
              }
            });
          });
        }
      } /*else if (config.media === "template") {
        this.cells.forEach((cell: any, index: number) => {
          // TODO: here we should insert the player vue directy
          if (cell.indexOf("<content></content>") >= 0) {
            const activePage = this.$store.state.view.page;
            // TODO: replace with getType != Template (line just here to avoid rendering loop)
            if (katonoma(activePage).indexOf("template") < 0) {
              const content = zevir.htmlizeSync(this.removeTitle(activePage.body));
              this.cells[index] = { template: cell.replace("<content></content>", content) };
            } else {
              this.cells[index] = { template: cell };
            }
            // console.log("replaced", cell);
          } else {
            this.cells[index] = { template: cell };
          }
        });
      }*/
    }
  }

  open(cell: any): void {
    // if (cell.image !== undefined && cell.image.reference !== undefined && this.katonoma(cell.image.reference.set) === "point-d-interrogation") {
    //   this.hasDialog = true;
    // } else
    if (cell.link === undefined) {
      this.$store.commit("dialog", { id: "slideshow", slides: this.getImages(), index: cell.galleridx });
    } else {
      this.emit("page-open", this.resolve(cell.link));
    }
  }

  getStyle(cell: any): string {
    const angle = cell.angle || undefined;
    if (angle != undefined) return `transform: rotate(${angle}deg);`;
    return "";
  }
}
</script>
