<!-- slideshow modal -->
<template>
  <div class="modal is-active slideshow" :class="{ 'is-presentation': !isGallery() }">
    <div @click="close" class="modal-background"></div>
    <div class="modal-content">
      <div class="toolbar">
        <a v-if="hasToolbarTop()" aria-label="previous" class="control button is-primary" @click="slide(-1)" :disabled="!hasAdjacentSlide(-1)">
          <span class="icon previous"></span>
        </a>
        <div class="field is-grouped">
          <a
            v-if="$store.state.iiakhawunti !== '.nn'"
            aria-label="edit"
            class="control button is-primary caption-edit"
            :class="{ 'is-loading': isSavingCaption }"
            @click="toggleEditCaption()"
          >
            <span v-if="!isSavingCaption" class="icon edit-caption"></span>
          </a>
          <a v-if="$store.state.iiakhawunti !== '.nn'" aria-label="delete" class="control button is-primary remove" @click="deleteActiveImage()">
            <span class="icon remove"></span>
          </a>
          <a aria-label="close" class="control button is-primary close" @click="close">
            <span class="icon close"></span>
          </a>
        </div>
        <a v-if="hasToolbarTop()" aria-label="next" class="control button is-primary" @click="slide(1)" :disabled="!hasAdjacentSlide(1)">
          <span class="icon next"></span>
        </a>
      </div>
      <swiper ref="slideshow" :options="options">
        <swiper-slide v-for="(slide, index) in this.$store.state.dialog.slides" :key="index">
          <div v-if="slide.url" class="swiper-zoom-container">
            <img :data-src="slide.url" class="swiper-lazy" />
             <div class="swiper-lazy-preloader"></div>
          </div>
          <player v-else :text="slide" :template="resolve('default')" class="content"></player>
        </swiper-slide>
        <div class="swiper-pagination swiper-pagination-white" slot="pagination"></div>
        <div class="swiper-button-prev button" slot="button-prev"></div>
        <div class="swiper-button-next button" slot="button-next"></div>
      </swiper>
      <div class="caption-panel">
        <div v-show="!isEditingCaption && caption !== undefined && caption !== ''" class="caption-content-panel">
          <player
            :template="resolve('default')"
            :text="prepareCaption(caption)"
            class="content caption-content"
            :class="{ 'has-no-sentence': hasCaptionWithoutSentence() }"
          ></player>
        </div>
        <div v-show="isEditingCaption" class="caption-editor-panel">
          <textarea ref="captionInput" class="caption-editor" rows="5" :value="caption || ''"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import mousetrap from "mousetrap";
import { Component, Vue } from "vue-property-decorator";

import "swiper/css/swiper.css";
import { Swiper, SwiperSlide } from "vue-awesome-swiper";
//import "swiper/swiper-bundle.css"; // Swiper > 6

import zevir from "@babouk/zevir";
import sam from "@babouk/sam";

import { katonoma, resolve, serialize } from "@babouk/model";

import bus from "../../main/bus";
import player from "../player.vue";
import utils from "../utils.js";

@Component({ components: { Swiper, SwiperSlide, player }, mixins: [utils] })
export default class Slideshow extends Vue {
  options = {
    pagination: {
      el: ".swiper-pagination",
      type: this.getPaginationType(),
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
      hideOnClick: true,
    },
    zoom: this.isGallery(),
    effect: "fade",
    fadeEffect: {
      crossFade: true,
    },
    preloadImages: false,
    lazy: {
      loadPrevNext: true,
      loadPrevNextAmount: 2,
      loadOnTransitionStart: true,
    },
    slidesPerView: 1,
    autoHeight: this.isGallery(),
    keyboard: {
      enabled: true,
    },
  };

  caption = "";

  isEditingCaption = false;
  isSavingCaption = false;

  close(): void {
    this.$emit("close");
  }

  hasToolbarTop(): boolean {
    return this.isSphere("bluelion") || this.isSphere("chelouchegallery");
  }

  mounted(): void {
    const swiper = (this.$refs.slideshow as any).$swiper;
    const data = this.$store.state.dialog;
    //console.log(data);
    const index = data.index;
    swiper.slideTo(index, 300, false);
    this.onSlideChange();
    swiper.on("slideChange", this.onSlideChange);
    mousetrap.bind("esc", this.close);
  }

  beforeDestroy(): void {
    mousetrap.unbind("esc");
  }

  hasAdjacentSlide(adjacence: number): boolean {
    if (this.$refs.slideshow !== undefined) {
      const swiper = (this.$refs.slideshow as any).$swiper;
      const position = swiper.realIndex;
      if (adjacence === -1) {
        return position > 0;
      } else {
        return position < swiper.slides.length - 1;
      }
    }
    return true;
  }

  slide(step: number): void {
    const swiper = (this.$refs.slideshow as any).$swiper;
    if (step === -1) {
      swiper.slidePrev();
    } else {
      swiper.slideNext();
    }
  }

  getPaginationType(): string {
    if (this.$store.state.dialog.slides.length > 8) {
      return "fraction";
    }
    return "bullets";
  }

  isGallery(): boolean {
    return this.$store.state.dialog.slides.some((slide: any) => slide.url !== undefined);
  }

  getActiveSlide(): any {
    const swiper = (this.$refs.slideshow as any).$swiper;
    const slides = this.$store.state.dialog.slides;
    return slides[swiper.realIndex];
  }

  onSlideChange(): void {
    const slide = this.getActiveSlide();
    if (slide === undefined) return;
    // Retrieve a caption only if slide contains a reference
    if (slide.reference !== undefined && slide.caption === undefined) {
      sam
        .getMediaMetadata(slide.reference)
        .then((response: any) => {
          if (response !== undefined && response.trim().length > 0) {
            try {
              // We need to distinguish between the original markdown (in case the user wants to edit it) and the one preprocessed for display (which is a bit transformed, e.g. the "data" block is extracted)
              slide.caption = response;
              //this.view.page.reference.id = ref;
              //this.view.page.body = heading + body;
            } catch (err) {
              console.log(err);
            }
          } else {
            slide.caption = undefined;
          }
          this.caption = slide.caption;
        })
        .catch((err: any) => {
          // There is no YAML file associated with the image, ignore
          console.log("No caption found", slide);
          this.caption = "";
          //this.caption = error.toString();
        });
    } else if (slide.caption !== undefined) {
      this.caption = slide.caption;
    }
  }

  // Prepares caption for display: extracts metadata, etc.
  //
  // # Laura
  //
  // Lorem ipsum....
  //
  // ::: data
  // author:
  // credits:
  // date:
  // ::::
  prepareCaption(caption: string): string {
    let metadata: any = caption.match(/::: data[\s\S]+?(?=:::):::/);
    if (metadata != null && metadata.length > 0) {
      metadata = metadata[0];
      // remove the lines with ":::"
      metadata = metadata.replace(/:::.*/g, "");
      metadata = this.parse(metadata);
      caption = caption.replace(/::: data[\s\S]+?(?=:::):::/g, "");
    }
    let heading = "";
    let body = "";
    let article = this.toArticle(caption);
    if (article.title !== undefined) {
      heading = "# " + article.title + "\n";
    }
    if (metadata != null && metadata !== undefined) {
      if (metadata.author !== undefined) {
        heading += "## " + metadata.author + "\n";
      }
      if (metadata.credit !== undefined) {
        heading += "::: div credit\n" + metadata.credit + "\n:::\n";
      }
    }
    if (article.body !== undefined) {
      body = "\n::: div description\n" + article.body + "\n:::\n";
    }
    if (this.isSphere("bluelion")) return heading + this.getMediaToolbar() + body;
    else return heading + body;
  }

  getMediaToolbar(): string {
    return `\n::: div media-toolbar
::: sharer
image: share-white.svg@.settings
:::
:::\n`;
  }

  deleteActiveImage() {
    const active = this.getActiveSlide();
    console.log("remove", active);
    if (active !== undefined && active.reference !== undefined) {
      bus.$emit("media-delete", active.reference);
    }
  }

  hasCaptionWithoutSentence(): boolean {
    return this.caption !== undefined && this.caption.indexOf(". ") < 0 && this.caption.indexOf("&hellip; ") < 0;
  }

  async toggleEditCaption() {
    if (this.isEditingCaption) {
      const slide = this.getActiveSlide();
      this.isSavingCaption = true;
      this.caption = await this.updateCaption(slide);
      slide.caption = this.caption;
      this.isSavingCaption = false;
    }
    this.isEditingCaption = !this.isEditingCaption;
  }

  async updateCaption(image: any): Promise<any> {
    //const fileName = katonoma(image.reference) + ".md";
    //const page = image.reference.set;
    const captionInput = this.$refs.captionInput as any;
    const metadata = captionInput.value;
    await sam.addMediaMetadata(image.reference, metadata);
    //const html = await zevir.htmlize(markdown);
    return Promise.resolve(metadata);
  }
}
</script>
