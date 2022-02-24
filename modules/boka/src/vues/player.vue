<!-- resource viewer -->
<template>
  <div class="player">
    <div v-show="!$store.state.playersReadyStates[id]" class="has-text-centered is-loading-zone">
      <div class="control is-loading"></div>
    </div>
    <!-- A surrounding div is needed in case the content contains several top level elements, since Vue templates accept only one top level element. -->
    <!-- using v-show="ready" fires a re-render -->
    <v-runtime-template @hook:updated="setIsReady" class="track" :template="`<div>${body}</div>`"></v-runtime-template>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import vRuntimeTemplate from "v-runtime-template";

import zevir from "@babouk/zevir";
import { Page, Reference } from "@babouk/model";
import sam from "@babouk/sam";

import button from "./macros/button.vue";
import hero from "./macros/hero.vue";
import grid from "./macros/grid.vue";
import slide from "./macros/slide.vue";
import jxta from "./macros/jxta.vue";
import map from "./macros/map.vue";
import rings from "./macros/rings.vue";
import sharer from "./macros/sharer.vue";
import signin from "./macros/signin.vue";
import slides from "./macros/slides.vue";
import style from "./macros/style.vue";
import utils from "./utils.js";

@Component({
  mixins: [utils],
  components: {
    xbutton: button,
    xstyle: style,
    grid,
    hero,
    sharer,
    slide,
    jxta,
    xmap: map, // this is because HTML element names (e.g. "map") cannot be used as component ids
    rings,
    Player,
    signin,
    slides,
    vRuntimeTemplate,
  },
})
export default class Player extends Vue {
  @Prop({})
  template: Reference;

  @Prop({})
  referent: Reference;

  @Prop({})
  text: string;

  @Prop({ default: false })
  isPage: boolean;

  // TODO: maybe use https://github.com/berniegp/vue-unique-id instead
  id = Math.random();

  // Properties with scalar type are used rather than a class such "view" because this allows to watch changs of these properties (tracking updates of objects is more complex with Vue)
  // @Prop({})
  // body: string;

  body: string = "";

  ready = false; // TODO: issue: since it's a reactive attribute, this fires a re-rendering of the component when it changes, an alternative is to store this status in the store, with one status per component, however this prevents any embedded map to show up correcly on load (it requires re-validation), so we keep this for now since it does not entail significant performance issue for now.

  /**
   * Concatenates pages included by blocks such as:
   *   ::: cat
   *   reference: Page-id
   *   :::
   */
  async processCats(input: string): Promise<string> {
    // https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace
    // TODO: see if it can be optimized, in particular just on pass over the matches instead of two currently (one to find the groups and load the partials, then one to actually replace them)
    const replaceAsync = async (str: string, regex: RegExp) => {
      const promises: any = [];
      // TODO: a simple exec would be more appropriate since, there is no need to replace yet (only when the promises get resolved).
      str.replace(regex, (match, ...args): string => {
        const obj = this.parse(args[0]);
        // Offers the possibility to override some properties on inclusion, e.g. to override a map center:
        //  ::: cat
        //  center: [0, 0]
        //  :::
        // While the included page contains:
        //  ::: map
        //  center: [1, 2]
        //  ...
        //  :::
        // Works just for map "center" or "zoom" properties for now, and just for one included page with such an overridden property.
        if (obj.center !== undefined || obj.zoom !== undefined) this.$store.commit("properties", obj);
        // The reference can point either at a page or at a media (if it contains a '@').
        if (obj.reference !== undefined) {
          let getContentFn = sam.getPage;
          let reference = this.resolve(obj.reference);
          if (obj.reference.indexOf("@") > 0) {
            // This is for including a media as content, e.g.: "wikipedia.md" is a media attached to a page, and we want to include the content of that media into the current one (or another one)
            // Syntax:
            // ::: cat
            // reference: wikipedia.md@
            // :::
            // TODO: we may rather consider a general resolve function which identifies whether it's a page, a media, a commit, etc.
            // TODO: actually sam.getPage and sam.getMedia consist almost of the same code
            // TODO: for now we consider only references like wikipedia.fr.md@ (empty string after '@'), meaning the page is actually the current one
            obj.reference = obj.reference + this.katonoma(this.referent);
            reference = this.resolveMedia(obj.reference);
            getContentFn = sam.getMedia;
          }
          const promise = getContentFn(reference, ...args);
          promises.push(promise);
        }
        return match[0];
      });
      const data: any[] = await Promise.all(promises);
      // Two cases depending whether the reference is a page (a "body" property is present) or a media (no  "body" property, the data is the markdown directly)
      return str.replace(regex, () => {
        let content = data.shift();
        if (content.body !== undefined) {
          content = content.body;
        }
        const html = zevir.htmlizeSync(this.removeTitle(content));
        // TODO add attribute 'data-reference' with value corresponding to the included reference
        if (content.body == undefined) {
          // TODO: handle the following syntax instead: ::: cat className
          return '<div class="wikipedia">' + html + "</div>";
        } else {
          return html;
        }
      });
    };
    return await replaceAsync(input, /<cat><pre><code>(([^<]|[\r\n])*)<\/code><\/pre><\/cat>/g);
  }

  async zevirize(): Promise<void> {
    //if (this.view.mode === "play") {
    if (this.katonoma(this.template) === "default") {
      // Remove first line, considering it's the title, which is already present in the main vue at the top
      let output = await zevir.htmlize(this.text);
      output = await this.processCats(output);
      this.body = output;
    } else {
      const template = await sam.getPage(this.template);
      let output = await zevir.htmlize(this.removeTitle(template.body));
      if (output.indexOf("<content></content>") >= 0) {
        // TODO: deal with title with more options
        const content = await zevir.htmlize(this.removeTitle(this.text));
        output = output.replace("<content></content>", content);
      }
      output = await this.processCats(output);
      // TODO: empty properties since they are not needed anymore once everything has been rendered
      //this.$store.commit("properties", {});
      this.body = output;
    }
    if (this.body.trim().length === 0) this.setIsReady();
    // } else if (this.view.mode === "form") {
    //   const wizards = await sam.getRings(this.view.template, ".has-wizard");
    //   if (wizards !== undefined && wizards.length > 0) {
    //     const output = await zevir.htmlize(wizards[0].value);
    //     this.template = output;
    //   } else {
    //     this.template = "No wizard template found, please check that the template for this page type is associated with a wizard.";
    //   }
    // }
  }

  mounted(): void {
    // Reinitialize the global slideshow only when rendering a real page, not just a block (eg a playable cell in a grid or a playable slideshow caption)
    if (this.isPage) this.$store.commit("onPagePlayerStart");
    //this.$store.commit("onPlayerStart");
    this.zevirize();
  }
  updated(): void {
    // TODO: render content only in non write submode
    //this.zevirize();
  }

  destroyed(): void {
    console.log("destroying player...");
    this.$store.commit("ready", { id: this.id, ready: false });
  }

  // @watch("view", { deep: true })
  @Watch("text")
  onTextChanged(value: any, oldValue: any) {
    console.log("player text changed", this.referent);
    this.zevirize();
  }

  setIsReady() {
    // Set a timeout so that styles get loaded if any
    setTimeout(() => {
      //this.ready = true;
      this.$store.commit("ready", { id: this.id, ready: true });
    }, 50);
  }
}
</script>
