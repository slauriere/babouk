<!-- signin form input fields -->
<template>
  <form v-on:submit.prevent autocomplete="on" class="signin">
    <div class="field">
      <div class="control">
        <input
          autocomplete="username"
          class="input is-primary boka-input"
          id="boka-input"
          v-model="login"
          :placeholder="$t('iiak.login')"
          style="margin-bottom: 0.5em"
          type="text"
          required
        />
      </div>
      <div class="control">
        <input
          autocomplete="current-password"
          class="input is-primary boka-input"
          v-model="password"
          :placeholder="$t('iiak.password')"
          :type="passwordVisibility"
          required
        />
        <button title="Show / hide password" type="button" class="password" @click="showHidePassword" aria-label="show/hide password" tabindex="-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M.2 10a11 11 0 0 1 19.6 0A11 11 0 0 1 .2 10zm9.8 4a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-2a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
          </svg>
        </button>
      </div>
    </div>
    <!-- name="submit" rather than type="submit" because the button can be moved outside the form (e.g. in a dialog footer) in case the macro is included in a dialog -->
    <button name="submit" @click="signin" :class="{ button: true, 'is-success': true, 'is-loading': isLoading }">{{ $t("iiak.signin") }}</button>
  </form>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

import sam from "@babouk/sam";
import bus from "../../main/bus";
import utils from "../utils.js";

@Component({ mixins: [utils] })
export default class Signin extends Vue {
  isLoading: boolean = false;
  login: string = "";
  password: string = "";
  passwordVisibility: string = "password";

  async signin(): Promise<boolean> {
    try {
      this.isLoading = true;
      // Clear cookies first, as we consider the user wants to re-sign-in in case he was signed-in already
      // this.clearCookies();
      const result = await sam.signin(this.$store.state.sphere, this.login, this.password);
      this.isLoading = false;
      // TODO: improve this via better event management
      // close the signin dialog if any
      this.$store.commit("dialog", {});
      bus.$emit("iiakhawunti-signed-in", result.login, result.token);
      const currentView = this.$store.state.view;
      if (currentView !== undefined && this.katonoma(currentView.page) === ".signin") {
        console.log("document1", location);
        let target = this.getQueryStringParameterValue("page");
        console.log("target", target);
        if (target === undefined || target == null) target = this.$store.state.settings.home;
        bus.$emit("page-close-active");
        bus.$emit("page-open", this.resolve(target));
      }
      return false;
    } catch (error) {
      this.isLoading = false;
      bus.$emit("error", error);
      return false;
    }
  }
  mounted(): void {
    //mousetrap(document.querySelector("input.boka-input")).bind("esc", this.close);
    //mousetrap.bind("enter", this.signin);
    const input = document.getElementById("boka-input");
    if (input != null) input.focus();
  }

  // TODO: turn show/hide password into a component or in any case share code with the signup vue
  // TODO: use an external SVG rather than the inline one
  showHidePassword() {
    this.passwordVisibility = this.passwordVisibility === "password" ? "text" : "password";
  }
}
</script>
