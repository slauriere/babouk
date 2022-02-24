<template>
  <div
    class="control dropdown is-right locale-menu"
    :class="{ 'is-active': on, 'is-down': !$store.state.mobile, 'is-up': $store.state.mobile }"
    v-click-outside="outside"
  >
    <div class="dropdown-trigger" @click="on = !on">
      <button class="control button is-primary navbar-link locale" aria-haspopup="true" aria-controls="dropdown-menu" aria-label="user menu">
        {{ locale }}
      </button>
    </div>
    <div class="dropdown-menu narrow" role="menu">
      <div class="dropdown-content">
        <a v-for="locale in $store.state.settings.locales" :key="locale" class="dropdown-item locale" @click="emit('set-language', locale)">{{ locale }}</a>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import bus from "../main/bus";
import utils from "./utils.js";

@Component({
  mixins: [utils],
})
export default class LanguageMenu extends Vue {
  on: boolean = false;
  locale: string = this.$store.state.locale != null ? this.$store.state.locale : this.$store.state.settings.locales[0];

  @Prop({ default: true })
  setLocale: boolean;

  emit(eventName: string, ...args: any): void {
    this.on = false;
    if (this.setLocale) {
      this.$store.commit("setLocale", args[0]);
      location.reload();
    } else {
      this.locale = args[0];
    }
  }

  outside() {
    this.on = false;
  }
}
</script>
