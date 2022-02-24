<template>
  <nav class="panel rings">
    <p class="panel-heading">
      {{ title }}
    </p>
    <item
      v-for="(ring, index) in getRings(innerPage, true)"
      :key="`${katonoma(innerPage)}-ring-${index}`"
      :editable="innerPage.editable"
      :reference="innerPage.reference"
      :ring="ring"
    ></item>
    <div class="panel-block">
      <a
        class="button is-link is-outlined"
        @click="$store.commit('dialog', { id: 'ring', relation: relation, type: types !== undefined && types.length > 0 ? types[0] : undefined })"
        v-on:click.prevent
      >
        Add
      </a>
      <a class="button is-link is-outlined" @click="removeFirst()" v-on:click.prevent :disabled="rings.length === 0">
        Remove
      </a>
    </div>
  </nav>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";

import { Page } from "@babouk/model";

import bus from "../../main/bus";
import item from "./item.vue";
import rings from "../ring/list.vue";
import utils from "../utils.js";

@Component({
  mixins: [utils],
  components: { item, rings },
})
export default class list extends rings {
  title = "";
  innerPage = new Page(this.resolve(""));

  mounted(): void {
    this.innerPage = this.$store.state.view.page;
    const data = this.parseNodeBody();
    console.log("rings", data);
    if (data !== undefined) {
      this.relation = data.relation;
      this.title = data.title;
      this.sort = data.sort;
      this.initialize(this.innerPage);
    }
  }

  removeFirst(): void {
    if (this.rings.length > 0) {
      bus.$emit("ring-delete", this.rings[this.rings.length - 1]);
    }
  }
}
</script>
