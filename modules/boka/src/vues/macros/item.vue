<!-- representation of a ring as an item in a list -->
<template>
  <!-- TODO: see why ring.value can be null -->
  <a
    v-if="ring.relatum != null && (ring.value == null || ring.value === undefined)"
    class="panel-block is-active"
    @click="openTarget"
    :href="href()"
    v-on:click.prevent
    :title="getTitle()"
  >
    {{ getLabel() }}
  </a>
  <img
    v-else-if="ring.value !== undefined && ring.value.indexOf('@') > 0"
    class="panel-block is-active thumbnail"
    :style="getThumbnail(toMedia(ring.value))"
    @click="$store.commit('dialog', { id: 'slideshow', images: [toMedia(ring.value)], index: 0 })"
  />
  <div v-else-if="ring.value !== undefined && ring.value.indexOf('#') === 0" class="panel-block is-active">
    <div class="ring-value-color" :style="{ backgroundColor: Ring.value }"></div>
  </div>
  <div v-else-if="ring.value !== undefined" class="panel-block is-active">
    <pre>{{ ring.value }}</pre>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";

import ringItem from "../ring/item.vue";
import utils from "../utils.js";

@Component({ mixins: [utils] })
export default class item extends ringItem {}
</script>
