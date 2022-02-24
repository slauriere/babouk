<template>
  <menu class="menu" v-click-outside="onOutside">
    <ul class="menu-list">
      <menuitem v-for="(item, index) in items" :key="index" :class="{ active: item.reference === katonoma($store.state.view) }">
        <a :href="item.reference" @click="emit('page-open', resolve(item.reference))" v-on:click.prevent v-html="htmlize(item.label)"></a>
        <ul>
          <menuitem v-for="(subitem, index) in item.items" :key="index" :class="{ active: item.reference === katonoma($store.state.view) }">
            <a :href="subitem.reference" @click="emit('page-open', resolve(subitem.reference))" v-on:click.prevent v-html="htmlize(subitem.label)"></a>
          </menuitem>
        </ul>
      </menuitem>
    </ul>
  </menu>
</template>

<script lang="ts">
// see also https://github.com/vue-bulma/bulma-ui/

import { Component, Prop, Vue } from "vue-property-decorator";

import zevir from "@babouk/zevir";

import bus from "../main/bus";
import utils from "./utils.js";

@Component({
  name: "xmenu",
  components: {},
  mixins: [utils],
})
export default class Menu extends Vue {
  @Prop({})
  items: {};

  emit(name: string, ...args: any) {
    bus.$emit(name, ...args);
    this.$store.commit("menu");
  }

  onOutside(event: any) {
    if (event !== undefined && event.target !== undefined) {
      const target = event.target;
      if (
        target.className !== undefined &&
        target.className.indexOf("navbar-burger") < 0 &&
        (target.parentElement == null || target.parentElement.className.indexOf("navbar-burger") < 0)
      )
        this.$store.commit("menu");
    }
  }
}
</script>

<!--
<script>
import Vue from "vue";

export default Vue.component("VbMenu", {
  provide() {
    return {
      rootMenu: this,
    };
  },
  props: {
    actived: [String, Number],
    defaultOpen: Array,
  },
  render() {
    const content = this.renderContent();
    return ``;
  },
  methods: {
    renderContent() {
      const { default: vNodes } = this.$slots;
      return vNodes.map((vNode) => {
        const { componentOptions: options = {} } = vNode;
        const { propsData = {} } = options;

        if (propsData.label) {
          return [`<p class="menu-label">${propsData.label}</p>`, vNode];
        } else {
          return vNode;
        }
      });
    },
    // Call on MenuItem
    handleToggerSubmenu(action, index) {
      this.$emit(action, index);
    },
    // Call on MenuItem
    handleItemClick(index) {
      this.$emit("selected", index);
    },
  },
});
</script>
-->
