<!-- list of files -->
<template>
  <div class="media-list" style="margin-top: 0.5rem;">
    <div class="field is-grouped is-grouped-multiline">
      <item v-for="(ref, index) in notImageNorImageMetadata" :editable="page.editable" :key="index" :reference="ref"></item>
      <inputz v-if="page.editable === true" :reference="page.reference"></inputz>
    </div>
    <slides v-if="media.length > 0" :pid="getId()" :references="media"></slides>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";

// TODO:
// - loop only on images, not any other file
// - add caption support
// - check how it works with videos

import { Page, normalize, resolve, Reference, Type } from "@babouk/model";

import sam from "@babouk/sam";
import bus from "../../main/bus";
import utils from "../utils.js";

import item from "./item.vue";
import inputz from "./inputz.vue";
import slides from "../macros/slides.vue";

@Component({
  components: {
    inputz,
    item,
    slides,
  },
  mixins: [utils]
})
export default class Docs extends Vue {
  media = new Array<Reference>();
  notImageNorImageMetadata = new Array<Reference>();

  @Prop({})
  mode: string;

  @Prop({})
  page: Page;

  background(ref: Reference): string {
    const href = this.serialize(ref);
    return `background-image: url('${href}'); width: 150px; height: 100px;`;
  }

  isImageMetadata(ref: Reference): boolean {
    const id = this.katonoma(ref);
    const l = ".md".length;
    return this.getImageExtensions().some((extension) => {
      extension += ".md";
      const i = id.indexOf(extension);
      if (i === id.length - extension.length) {
        // file is image-id.md
        // now check that the corresponding image is part of the media (hence that the metadata is not isolated)
        const imageId = id.substring(0, id.length - l);
        const filtered = this.media.filter((mediaReference) => this.katonoma(mediaReference) === imageId);
        return filtered.length > 0;
      }
    });
  }

  // normalize HTML element id: start with letter, has only letters, digits, hyphens, underscores, colons and periods
  // TODO: move this to external utility / mixin
  getId() {
    let str = normalize(this.katonoma(this.page.reference));
    return (
      "slideshow-" +
      str
        .replace(/^([^a-zA-Z])/, "a-$1")
        .replace(/[^a-zA-Z0-9.:\-_]/g, "-")
        .replace(/-+/g, "-")
    );
  }

  mounted(): void {
    sam.getMediaList(this.page.reference).then((files: Reference[]) => {
      this.media = files.filter((reference) => this.isImage(reference));
      this.notImageNorImageMetadata = files.filter((reference) => !this.isImage(reference) && !this.isImageMetadata(reference));
    });

    // Remove listenters first, otherwise they can be added several times, not sure why
    bus.$off(this.katonoma(this.page.reference) + "-media-created");
    bus.$off(this.katonoma(this.page.reference) + "-media-deleted");

    bus.$on(this.katonoma(this.page.reference) + "-media-created", (data: any) => {
      console.log("media-created", data);
      if (data !== undefined) {
        data.forEach((element: any, index: number) => {
          const newReference = resolve(element.name, this.page.reference, Type.MEDIA);
          // TODO: don't have the same reference twice: either use sets, maps, equals, hashcode...
          if (this.isImage(newReference)) this.media.push(newReference);
          else if (!this.isImageMetadata(newReference)) this.notImageNorImageMetadata.push(newReference);
        });
      }
    });

    bus.$on(this.katonoma(this.page.reference) + "-media-deleted", (ref: Reference) => {
      // TODO: improve code / shorten the checks
      console.log("file-deleted", ref);
      if (ref !== undefined && this.katonoma(ref) !== undefined) {
        if (this.isImage(ref)) {
          this.media = this.media.filter((item) => this.katonoma(item) !== this.katonoma(ref));
        } else if (!this.isImageMetadata(ref)) {
          this.notImageNorImageMetadata = this.notImageNorImageMetadata.filter((item) => this.katonoma(item) !== this.katonoma(ref));
        }
      }
    });
  }
}
</script>
