<!-- representation of a file as an item in a list -->
<template>
  <div class="control">
    <div class="tags has-addons">
      <a title="Open file" class="tag is-link" :href="href()" target="_blank">{{ katonoma(reference) }}</a>
      <a v-if="editable === true" title="Remove file" class="tag is-delete" @click="erase"></a>
    </div>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";

import { katonoma, Reference, serialize } from "@babouk/model";

import sam from "@babouk/sam";
import bus from "../../main/bus";

@Component({})
export default class Item extends Vue {
  @Prop({})
  editable: boolean;

  @Prop({})
  reference: Reference;

  href(): string {
    return serialize(this.reference);
  }

  erase(): void {
    bus.$emit("media-delete", this.reference);
  }

  katonoma(s: Reference): string {
    return katonoma(s);
  }
}
</script>
