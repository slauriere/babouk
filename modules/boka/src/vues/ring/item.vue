<!-- representation of a ring as an item in a list -->
<template>
  <div class="control">
    <div class="tags has-addons">
      <!-- TODO: why do we need to check both relatum not undefined nor null -->
      <a
        v-if="ring.relatum !== undefined && ring.relatum != null"
        class="tag is-link"
        @click="openTarget"
        :href="href()"
        v-on:click.prevent
        :title="getInfo()"
        >{{ getLabel() }}</a
      >
      <a
        v-else-if="ring.value != null && typeof getValue() === 'string' && getValue().indexOf('http') === 0"
        class="tag is-link is-value"
        :href="getValue()"
        :title="getInfo()"
      >
        {{ getValue() }}</a
      >
      <span v-else class="tag" :title="getInfo()"> {{ getValue() }}</span>
      <a v-if="editable === true" class="tag edit-ring" @click="$store.commit('dialog', { id: 'ring', ring: ring })" title="Edit"
        ><span class="icon edit-ring"></span
      ></a>
      <a v-if="editable === true" class="tag is-delete" @click="scratch" title="Remove"></a>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { katonoma, Reference, Ring, Type } from "@babouk/model";

import bus from "../../main/bus";
import utils from "../utils.js";

@Component({
  mixins: [utils],
})
export default class Item extends Vue {
  @Prop({})
  editable: boolean;

  @Prop({})
  reference: Reference;

  @Prop({})
  ring: Ring;

  scratch(): void {
    // TODO: see how to use singular / plural
    bus.$emit("ring-delete", this.ring);
  }
  getLabel(): string | undefined {
    if (katonoma(this.reference) === katonoma(this.ring.referent)) {
      if (this.ring.relatum != undefined) return this.ring.relatum.title;
      else if (this.ring.value != undefined) return this.ring.value;
      return "";
    } else return this.ring.referent.title;
  }

  // Infer target dynamically: either relatum or referent
  getTargetId(): string {
    if (katonoma(this.reference) === katonoma(this.ring.referent)) {
      if (this.ring.relatum != undefined) return katonoma(this.ring.relatum);
      else return "";
    }
    return katonoma(this.ring.referent);
  }
  getInfo(): string {
    let info = "";
    if (this.ring.relation.reference.inverse !== true) {
      if (this.ring.relatum !== undefined) info = `${this.ring.relation.title} ${this.ring.relatum.title}`;
      else if (this.ring.value !== undefined) info = `${this.ring.relation.title} ${this.ring.value}`;
    } else if (this.ring.relatum !== undefined) {
      info = `${this.ring.relatum.title} ${this.ring.relation.title} ${this.ring.referent.title}`;
    } else info = "..." + this.ring.relation.title;

    if (this.ring.properties !== undefined) {
      info += "\n" + this.yamlize(this.ring.properties);
    }
    return info;
  }
  href(): string {
    const id = this.getTargetId();
    return `./${id}`;
  }
  openTarget(): void {
    const id = this.getTargetId();
    //if (this.mode === "write") {
    bus.$emit("page-open", this.resolve(id));
    //} else {
    //document.location.href = `./${id}`;
    //}
  }

  getValue(): string {
    let value = this.ring.value;
    if (value === undefined) return "";
    if (katonoma(this.ring.relation) === "a-comme-identifiant-wikipedia") {
      // remove the prefix if any
      const idx = value.indexOf(":");
      if (idx > 0) value = value.substring(idx + 1);
      return `https://fr.wikipedia.org/wiki/${value}`;
    } else {
      if (value.length > 70) return value.substring(0, 70) + " [...]";
      return value;
    }
  }
}
</script>
