<template>
  <div class="dropdown is-right is-down" :class="{ 'is-active': on }" v-click-outside="outside">
    <div class="dropdown-trigger" @click="on = !on">
      <button class="control button is-primary" aria-haspopup="true" aria-controls="dropdown-menu" aria-label="user menu">
        <span class="icon user"></span>
      </button>
    </div>
    <div class="dropdown-menu" role="menu">
      <div class="dropdown-content">
        <a v-if="!isSignedIn()" @click="emit('iiakhawunti-sign-in')" class="dropdown-item">{{ $t("iiak.signin") }}</a>
        <a v-if="!isSignedIn()" @click="emit('iiakhawunti-sign-up')" class="dropdown-item">{{ $t("iiak.signup") }}</a>
        <a v-if="isSignedIn()" @click="emit('page-open', resolve($store.state.iiakhawunti), true, 'write')" class="dropdown-item">{{
          $store.state.iiakhawunti
        }}</a>
        <hr v-if="isSignedIn()" class="dropdown-divider" />
        <a v-if="isSignedIn()" @click="emit('iiakhawunti-sign-out')" class="dropdown-item">{{ $t("iiak.out") }}</a>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { Reference, resolve, Type } from "@babouk/model";

import bus from "../main/bus";

@Component({
  components: {},
})
export default class UserMenu extends Vue {
  on: boolean = false;

  emit(eventName: string, ...args: any): void {
    this.on = false;
    bus.$emit(eventName, ...args);
  }

  isSignedIn() {
    return this.$store.state.iiakhawunti !== ".nn";
  }

  outside() {
    this.on = false;
  }

  resolve(id: string): Reference {
    // TODO: the "sys" variables should be shared with ub
    const parent = resolve(".iiakhawunti", this.$store.state.sphere, Type.SERVICE);
    return resolve(id, parent);
  }
}
</script>
