<!-- dialog box for signup -->
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
      <form v-on:submit.prevent autocomplete="on">
        <section class="modal-card-body">
          <slot name="body"></slot>
          <div class="field">
            <div class="control">
              <input
                autocomplete="username"
                class="input is-primary boka-input"
                id="boka-input"
                v-model="login"
                :placeholder="$t('iiak.login')"
                required
                style="margin-bottom: 0.5em"
                type="text"
              />
            </div>
            <div class="control">
              <input
                autocomplete="current-password"
                class="input is-primary boka-input"
                v-model="password"
                :placeholder="$t('iiak.password')"
                required
                :type="passwordVisibility"
              />
              <button title="Show / hide password" type="button" class="password" @click="showHidePassword" tabindex="-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M.2 10a11 11 0 0 1 19.6 0A11 11 0 0 1 .2 10zm9.8 4a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-2a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
                </svg>
              </button>
            </div>
          </div>
        </section>

        <footer class="modal-card-foot">
          <button type="submit" @click="signup" :class="{ button: true, 'is-success': true, 'is-loading': isLoading }">{{ $t("iiak.signup") }}</button>
          <!-- <button @click="close" class="button">{{ $t("action.cancel") }}</button> -->
        </footer>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import mousetrap from "mousetrap";

import { Component, Vue } from "vue-property-decorator";

import sam from "@babouk/sam";

import bus from "../../main/bus";

@Component({})
export default class SignupDialog extends Vue {
  isLoading: boolean = false;
  login: string = "";
  password: string = "";
  passwordVisibility: string = "password";

  close(): void {
    this.$emit("close");
  }

  async signup(): Promise<any> {
    try {
      this.isLoading = true;
      const result = await sam.signup(this.$store.state.sphere, this.login, this.password);
      bus.$emit("iiakhawunti-signed-up", result.login, result.token);
      this.isLoading = false;
      this.close();
    } catch (error) {
      this.isLoading = false;
      bus.$emit("error", error);
    }
  }
  mounted(): void {
    mousetrap.bind("esc", this.close);
    //mousetrap(document.querySelector("input.boka-input")).bind("esc", this.close);
    //mousetrap.bind("enter", this.signup);
    //mousetrap(document.querySelector("input.boka-input")).bind("enter", this.signup);
    const input = document.getElementById("boka-input");
    if (input != null) input.focus();
  }
  beforeDestroy(): void {
    mousetrap.unbind("esc");
    mousetrap.unbind("enter");
  }

  showHidePassword() {
    this.passwordVisibility = this.passwordVisibility === "password" ? "text" : "password";
  }
}
</script>
