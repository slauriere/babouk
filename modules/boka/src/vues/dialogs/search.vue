<!-- dialog box for searching a resource and open it or create it -->
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
        <Multiselect
          :custom-label="(elt) => (elt.title != undefined ? elt.title : '')"
          deselect-label=""
          id="kumbuk-input"
          :internal-search="false"
          label="title"
          :loading="isLoading"
          v-model="selectedEntry"
          :multiple="false"
          open-direction="bottom"
          :options="pages"
          :options-limit="1000"
          placeholder="Type to search or create"
          :searchable="true"
          @search-change="debounceSearch"
          @select="onSelect"
          select-label=""
          selected-label=""
          :show-no-results="false"
          :show-no-options="false"
          @tag="onSelectNew"
          tag-placeholder="+"
          :taggable="true"
          track-by="reference"
        >
          <!--<span slot="noOptions">Warning...</span>-->
        </Multiselect>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success" @click="openPage()" :disabled="isNewEntry === true || isEmpty()" id="kumbuk-open-button">
          {{ $t("page.open") }}
        </button>
        <button class="button is-success is-create" @click="createPage" :disabled="isNewEntry === false || isEmpty()" id="kumbuk-create-button">
          {{ $t("page.create") }}
        </button>
        <button
          v-if="$store.state.settings.locales !== undefined && $store.state.settings.locales.length > 1"
          class="button is-success is-create"
          @click="createPage"
          :disabled="isNewEntry === true || isEmpty()"
          id="kumbuk-translate-button"
        >
          {{ $t("page.translate") }}
        </button>
        <LanguageMenu
          ref="language"
          v-if="$store.state.settings.locales !== undefined && $store.state.settings.locales.length > 1"
          :setLocale="false"
          :disabled="isEmpty()"
        />
        <!-- <button class="button" @click="close">{{ $t("action.cancel") }}</button>  -->
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import mousetrap from "mousetrap";
import Multiselect from "vue-multiselect";
import "vue-multiselect/dist/vue-multiselect.min.css";

import { Component, Prop, Vue } from "vue-property-decorator";

import { Page, katonoma, Reference } from "@babouk/model";

import bus from "../../main/bus";
import sam from "@babouk/sam";
import LanguageMenu from "../language-menu.vue";
import utils from "../utils.js";

@Component({
  components: {
    LanguageMenu,
    Multiselect,
  },
  mixins: [utils],
})
export default class Search extends Vue {
  pages: Array<Page> = new Array<Page>();
  isLoading: boolean = false;
  selectedEntry = new Page(this.resolve(""));
  isNewEntry = false;
  debounceSearch = () => "";

  onSelectNew(label: string): void {
    this.selectedEntry = new Page(this.resolve(label));
    this.isNewEntry = true;
    this.focus("kumbuk-create-button");
  }

  close(): void {
    this.$emit("close");
  }

  createPage(): void {
    console.log("language", this.$refs.language);
    const languageMenu = this.$refs.language as any;
    let language = "default";
    // Set a non-default language only if the selected language is not the first one declared in the settings (which is considered the default)
    if (languageMenu != null && languageMenu.locale !== this.$store.state.settings.locales[0]) {
      language = languageMenu.locale;
    }
    this.close();
    bus.$emit("page-create", katonoma(this.selectedEntry), language);
  }

  isEmpty(): boolean {
    return this.selectedEntry === undefined || katonoma(this.selectedEntry) === undefined || katonoma(this.selectedEntry).trim().length === 0;
  }

  openPage() {
    this.close();
    if (this.selectedEntry !== undefined) {
      bus.$emit("page-open", this.selectedEntry.reference, true);
    }
  }

  onSelect(p: Page): void {
    this.isNewEntry = false;
    this.focus("kumbuk-open-button");
  }

  search(query: string): void {
    if (query != null && query.trim().length > 0) {
      this.isLoading = true;
      sam
        .search(query)
        .then((pages: Array<Page>) => {
          this.pages = pages;
          this.isLoading = false;
        })
        .catch((error: Error) => {
          this.isLoading = false;
          bus.$emit("error", error);
        });
    }
  }

  mounted(): void {
    // Keyboard actions: 'escape' should close the modal when the modal has the focus or when the modal selector itself has the focus, hence 'esc' is bound not only to the vue but also to the .multiselect element itself.
    mousetrap.bind("esc", this.close);
    mousetrap(document.querySelector(".multiselect")).bind("esc", this.close);
    this.focus("kumbuk-input");
    this.debounceSearch = this.debounce(this.search.bind(this), 300);
  }

  beforeDestroy() {
    mousetrap(document.querySelector(".multiselect")).unbind("esc");
    mousetrap.unbind("esc");
    mousetrap.unbind("enter");
  }

  focus(name: string): void {
    const elt = document.getElementById(name);
    // Use a timeout in order to let Vue possibly update the element based on reactive properties beforehand (eg turn it from disabled to
    // enabled).
    if (elt != null) {
      setTimeout(() => {
        elt.focus();
      }, 20);
    }
  }
}
</script>
<style>
.multiselect__option--highlight {
  background: #828282;
}

.multiselect__option--selected.multiselect__option--highlight,
.multiselect__option--selected.multiselect__option--highlight:after {
  background: #828282;
}

/** This is a trick to display inexistent entries with a specific background. */
.multiselect__option[data-select="+"] {
  background: #f1f1f1;
}

.multiselect__option[data-select="+"]::after {
  content: "+";
}

.multiselect__option--highlight[data-select="+"],
.multiselect__option--highlight[data-select="+"]::after {
  background: #828282;
}
</style>
