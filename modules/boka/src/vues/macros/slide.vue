<!-- image -->
<template>
  <figure v-if="error === '' && url !== ''">
    <a :href="url" @click="emit('open-slideshow-' + slideSetId + '-at', index)" aria-label="open slideshow" v-on:click.prevent
      ><img :src="url" :style="style" :alt="caption"
    /></a>
    <figcaption v-if="caption.length > 0" v-html="caption" />
  </figure>
  <a
    v-else-if="error === ''"
    href=""
    class="control button is-primary"
    @click="emit('open-slideshow-' + slideSetId + '-at', index)"
    aria-label="open slideshow"
    v-on:click.prevent
    >Start presentation</a
  >
  <pre v-else-if="error !== ''" class="error"><code>{{ error }}</code></pre>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import sam from "@babouk/sam";

import bus from "../../main/bus";
import utils from "../utils.js";

/**
 * Macro for pointing at an image in a slideshow, possibly with a specific position (for positioning the image in its container)
 * ::: slide
 * index: 1
 * position: 0 15%
 * :::
 */

@Component({ mixins: [utils] })
export default class Slide extends Vue {
  index = -1;
  url = "";
  caption = "";
  slideSetId = "";
  error = "";
  style = "";

  mounted(): void {
    const slot = this.parseNodeBody();
    if (slot.index !== undefined) {
      // The block contains an index reference to an image in a slideshow
      const slides = this.$store.state.slides;
      if (slides?.slides !== undefined) {
        // There is a slideshow that was declared above in the page, it was saved in the store during the rendering process, we consider it's the one to be used
        //this.slideshowId = slot.slideshow !== undefined ? slot.slideshow : globalSlideSet.id;
        this.slideSetId = slides.id;
        this.index = slot.index;
        const slide = slides.slides.filter((item: any, index: number) => index === this.index);
        if (slide !== undefined && slide.length > 0 && slide[0].url !== undefined) {
          this.url = slide[0].url;
          //this.caption = item[0].caption !== undefined ? item[0].caption.html : undefined;
          //if (data.caption !== undefined) this.caption = zevir.htmlizeSync(data.caption);
          sam
            .getMediaMetadata(slide[0].reference)
            .then((metadata: string) => {
              const article = this.toArticle(metadata);
              if (article.title !== undefined) {
                this.caption = this.htmlize(article.title);
              }
            })
            .catch((err: any) => {
              console.log("[slide] no metadata found for: ", slide[0]);
            });
        }
        if (slot.position !== undefined) {
          this.style = "object-position: " + slot.position;
        }
      }
    } else if (slot.error !== undefined) {
      this.error = slot.error;
    }
  }
}
</script>
