<template>
  <div class="navbar-item">
    <div class="field is-grouped">
      <button
        v-for="action in actions.filter((action) => action.isPresent === undefined || action.isPresent())"
        :key="action.id"
        :title="$t(action.id)"
        class="control button is-primary"
        :aria-label="action.id"
        @click="emit(...action.intent)"
        :disabled="!isActive(action)"
      >
        <span class="icon" :class="action.icon"></span>
      </button>
      <LanguageMenu v-if="$store.state.settings.locales !== undefined && $store.state.settings.locales.length > 1" />
      <UserMenu v-if="mode === 'top'" />
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { Reference, resolve, Type } from "@babouk/model";

import LanguageMenu from "./language-menu.vue";
import UserMenu from "./user-menu.vue";

import utils from "./utils.js";

@Component({
  mixins: [utils],
  components: { LanguageMenu, UserMenu },
})
export default class Toolbar extends Vue {
  @Prop({})
  mode: string;

  @Prop({})
  actions: [];

  isActive(action: any): boolean {
    if (action.isActive === undefined) return true;
    const type = typeof action.isActive;
    if (type === "string") {
      // This is when an action is active only for a specific template id, not sure it is used.
      const currentView = this.$store.state.view;
      if (currentView !== undefined && currentView.template === action.isActive) return true;
      return false;
    } else if (type === "function") {
      return action.isActive();
    } else {
      return false;
    }
  }

  getWhakardClass(): string {
    const sylka = this.$store.state.whakard;
    if (sylka === undefined) {
      return "control button is-primary whakar-ju";
    } else {
      return "control button is-info whakar-ei";
    }
  }

  hasWhakar(): boolean {
    let flag: boolean = this.isSignedIn();
    flag = flag && this.katonoma(this.$store.state.sphere) === "izdubar";
    flag = flag && (this.$store.state.page === undefined || !this.katonoma(this.$store.state.page).startsWith("."));
    flag = flag && this.katonoma(this.$store.state.page) !== this.$store.state.iiakhawunti;
    return flag;
  }

  isSignedIn() {
    return this.$store.state.iiakhawunti !== ".nn";
  }

  resolve(id: string): Reference {
    // TODO: the "sys" variables should be shared with ub
    const parent = resolve(".iiakhawunti", this.$store.state.sphere, Type.SERVICE);
    return resolve(id, parent);
  }

  whakard(): string {
    const sylka = this.$store.state.whakard;
    if (sylka === undefined) {
      return `<span>${this.$t("action.whakar")}</span>`;
    } else {
      return `<span>${this.$t("action.unwhakar")}</span>`;
    }
  }
}
</script>
