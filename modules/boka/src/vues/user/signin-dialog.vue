<!-- signin dialog -->
<template>
  <div class="modal is-active">
    <div @click="close" class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <div class="modal-card-title">
          <slot name="header">Title</slot>
        </div>
        <button @click="close" aria-label="close" class="delete"></button>
      </header>

      <section class="modal-card-body">
        <slot name="body"></slot>
        <signin-macro />
      </section>

      <footer class="modal-card-foot">
        <!-- <button type="submit" @click="signin" :class="{ button: true, 'is-success': true, 'is-loading': isLoading }">{{ $t("iiak.signin") }}</button> -->
        <!-- <button @click="close" class="button">{{ $t("action.cancel") }}</button> -->
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import mousetrap from "mousetrap";

import { Component, Vue } from "vue-property-decorator";

import sam from "@babouk/sam";
import bus from "../../main/bus";
import signinMacro from "../macros/signin.vue";

@Component({
  components: {
    signinMacro,
  },
})
export default class SigninDialog extends Vue {
  close(): void {
    this.$emit("close");
  }

  mounted(): void {
    mousetrap.bind("esc", this.close);
    // Move button to dialog footer
    const button = document.querySelector(".modal form.signin button[name='submit']");
    const footer = document.querySelector(".modal footer");
    if (button != null && footer != null) footer.appendChild(button);
  }
  beforeDestroy(): void {
    mousetrap.unbind("esc");
    mousetrap.unbind("enter");
  }
}
</script>
