<template>
  <div>
    <div class="background" :style="background"></div>
    <div class="content mendeleev">
      <h1 class="title">{{ title }}</h1>
      <div class="grid columns is-multiline is-mobile">
        <div class="column is-12-mobile is-4-tablet">
          <div class="text" v-html="text" />
        </div>
        <div class="column is-12-mobile is-8-tablet">
          <div class="periodic-table">
            <div v-for="entry in elements" :key="entry.id" :class="classes(entry)">
              <div class="square">
                <div class="atomic-number">{{ entry.index }}</div>
                <div class="label">
                  <div class="symbol" v-html="entry.body"></div>
                </div>
                <div class="name">{{ entry.name }}</div>
                <ul class="atomic-weight">
                  <li>{{ entry.symbol }}</li>
                </ul>
              </div>
            </div>
            <div class="placeholder lanthanoid c3 r6">
              <div class="square"><span class="range">57-71</span></div>
            </div>
            <div class="placeholder actinoid c3 r7">
              <div class="square"><span class="range">89-103</span></div>
            </div>
            <div class="gap c3 r8"></div>
            <div class="credits" v-html="credits"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import yaml from "js-yaml";
import { Component, Prop, Vue } from "vue-property-decorator";

import { Page, katonoma } from "@babouk/model";

import zevir from "@babouk/zevir";

@Component({
  components: {},
})
export default class Mendeleev extends Vue {
  @Prop({})
  page: Page;
  background: string = "";
  elements: any[] = new Array<any>();
  title: string = "";
  credits: string = "";
  text: string = "";
  mounted() {
    // Add specific stylesheet
    // TODO: move this to utility method either in vuex or in a utility singleton, factorize with code existing in ngutu.ts for settings
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.type = "text/css";
    css.href = `/${katonoma(this.page)}/media/mendeleev.css`;
    document.getElementsByTagName("head")[0].appendChild(css);

    let data = yaml.safeLoad(this.page.body, yaml.Schema.JSON_SCHEMA);
    this.title = data.title;
    this.credits = data.credits != undefined ? zevir.htmlizeSync(data.credits) : "";
    this.elements = data.elements;
    this.text = zevir.htmlizeSync(data.text);
    data.elements.forEach((element: any) => {
      let text = element.text;
      text = text.replace(/\s(!|\?|:)/g, "&nbsp;$1"); // make sure there is no line break before an exclamation or question mark
      zevir.htmlize(text).then((output: any) => {
        element.body = output;
        this.elements.push(element);
      });
    });
  }

  classes(entry: any): string {
    const clazz = entry.styl != undefined ? entry.styl : "";
    return `element ${entry.category} c${entry.x} r${entry.y} ${clazz}`;
  }
}
</script>
