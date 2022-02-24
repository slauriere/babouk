<template>
  <div class="pages">
    <div
      class="tabs"
      style="margin-bottom: 0.8rem;"
      v-show="($store.state.settings.tabs !== undefined && $store.state.settings.tabs['show-first'] === true) || $store.state.views.length > 1"
    >
      <ul>
        <li v-for="view in $store.state.views" :class="{ 'is-active': view.active }" :key="`${key(view)}-tab`">
          <a @click="emit('page-activate', view)">{{ getPageShortLabel(view.page) }} {{ getPageStatusIndicator(view) }}</a>
        </li>
      </ul>
    </div>
    <div class="bodies">
      <!-- NB: we prefer v-show over v-if as v-if would fire a reload of the view each time the active element changes -->
      <dispatcher v-for="view in $store.state.views" :view="view" :key="key(view)" v-show="view.active"></dispatcher>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { Page, View, Reference } from "@babouk/model";

import bus from "../main/bus";

import dispatcher from "./page/dispatcher.vue";

import utils from "./utils.js";

@Component({
  components: {
    dispatcher,
  },
  mixins: [utils],
})
export default class Tabs extends Vue {
  emit(event: string, ...args: any) {
    // TODO: should we name events with verb first? "activate-page" etc. ?
    bus.$emit(event, ...args);
  }
  getPageStatusIndicator(view: View): string {
    return view.saved === false ? "*" : "";
  }

  getPageShortLabel(page: Page): string {
    if (page.title != undefined) {
      if (page.title.length > 38) {
        // get substring without cutting word
        return page.title.replace(/^(.{38}[^\s]*).*/, "$1").concat("…");
      }
      return page.title;
    } else {
      return this.urize(page.reference);
    }
  }

  key(view: View): string {
    return `${this.urize(view.page.reference)}-${view.template}`;
  }
}
</script>
