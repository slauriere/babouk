<template>
  <div class="field is-grouped is-grouped-multiline thumbnails">
    <!-- TODO: check if this is an issue that the key is the imageIndex, hence several elements with same key in case of several tabs? -->
    <a v-for="(image, index) in slides" :href="image.url" :key="index" v-on:click.prevent>
      <img class="thumbnail" @click="emit('open-slideshow-' + id + '-at', index)" :src="getThumbnail(image)" />
    </a>
  </div>
  <!-- keep this for possible syntax reminder :style="{ backgroundImage: 'url(' + href(media) + ')', width: '150px', height: '100px' }" -->
  <!-- A slideshow has the page id: several galleries can be present in case several tabs are open. -->
  <!-- :id="normalizid(page.reference) -->
</template>
<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import sam from "@babouk/sam";
import zevir from "@babouk/zevir";
import { Reference, katonoma } from "@babouk/model";

import utils from "../utils.js";
import bus from "../../main/bus";

@Component({
  mixins: [utils],
})
export default class Slides extends Vue {
  origin: number = -1;
  slides: any[] = [];
  id: string = "slideshow-" + Math.floor(Math.random() * Math.floor(100)); // TODO: probably move to mounted. TODO: is it really needed? Possibly when multiple tabs opened.

  // Prop used for injecting the slides via their references directly (used by necklace.vue for displaying media attached to a page).
  @Prop({})
  references: Reference[];

  @Prop({})
  pid: string; // TODO: check if it's still needed since we also have a generated this.id

  mounted(): void {
    if (this.references !== undefined && this.references.length > 0 && this.pid !== undefined) {
      this.slides = this.convertReferences(this.references);
      this.id = this.pid;
    } else {
      let slot = this.parseNodeBody();
      if (slot.error === undefined) {
        // The slot is as follows:
        //
        // :::slideshow
        // - reference: img-1.jpg@page
        // - reference: img-2.jpg@page
        // :::

        if (slot.config !== undefined) {
          if (slot.config.mode === "concat") {
            this.$store.commit("onSetConcatenateSlides");
          }
          slot = slot.body;
        }
        if (Array.isArray(slot)) {
          this.slides = slot.map((item: any) => {
            if (item.reference !== undefined) {
              let obj = this.toMedia(item.reference);
              //if (obj !== undefined) obj.caption = { markdown: item.title, html: zevir.htmlizeSync(item.title || "") };
              return obj;
            } else {
              console.log("warning: undefined reference", item);
              return undefined;
            }
          });
          this.$store.commit("slides", { id: this.id, slides: this.slides });
        } else if (slot.reference !== undefined) {
          // The reference points at a page, and we display all the page media images in the slideshow, except the ones marked as 'except'
          const exclude = this.arrayize(slot.exclude);
          const ref = this.resolve(slot.reference);
          sam.getMediaList(ref).then((list: any) => {
            list = list.filter((media: Reference) => !exclude.some((excluded) => excluded === katonoma(media)) && this.isImage(media));
            this.slides = this.convertReferences(list);
            this.$store.commit("slides", { id: this.id, slides: this.slides });
          });
        }
      } else {
        // The slot is as follows:
        //
        // :::slideshow
        // # Slide 1
        // * alpha
        // * beta
        // * gamma
        // # Slide 2
        // ...

        let slot = this.getSlotAsText();
        slot = "\n" + slot; // add carriage return for the first heading, which may come just after the macro declaration:
        const sections = slot
          .split("\n# ")
          .filter((section) => section.trim().length > 0) // remove empty slides (in particular the first one returned by 'split' is empty)
          .map((section) => "# " + section); // re-add the heading character, which 'split' has removed

        // Store the slides in the state for possible call from a button (see 'slide.vue')
        this.$store.commit("slides", { id: this.id, slides: sections });
        // Open the slideshow dialog
        this.$store.commit("dialog", { id: "slideshow", slides: sections, index: 0 });
        // Don't store the slides in the 'this.slides' field because we don't need to display them as thumbnails (unless we manage to generate real slide thumbnail in the futuure, from textual slides)
      }
    }

    bus.$on("open-slideshow-" + this.id + "-at", (index: number) => {
      // If this is the main slideshow, use slides in the store in case they were concatenated with other set of slides
      let slides = this.slides;
      if (this.id === this.$store.state.slides.id) slides = this.$store.state.slides.slides;
      this.$store.commit("dialog", { id: "slideshow", slides: slides, index: index });
    });
  }

  convertReferences(references: Reference[]): any[] {
    return references.map((ref: Reference) => {
      return { id: `${katonoma(ref)}@${katonoma(ref.set)}`, url: this.serialize(ref), reference: ref };
    });
  }

  destroyed() {
    console.log("destroying slides...");
    bus.$off("open-slideshow-" + this.id + "-at");
  }

  @Watch("references")
  onPropertyChanged(value: any, oldValue: any) {
    this.slides = this.convertReferences(value);
  }
}
</script>
