<!-- resource viewer -->
<template>
  <article>
    <h1
      v-if="
        (view.mode !== 'play' ||
          view.template === 'default' ||
          ($store.state.settings.templates !== undefined && view.template === $store.state.settings.templates.page)) &&
          katonoma(view) !== $store.state.settings.home
      "
    >
      {{ view.page.title }}
    </h1>
    <necklace
      v-if="
        ((view.template === 'default' || ($store.state.settings.templates !== undefined && view.template === $store.state.settings.templates.page)) &&
          katonoma(view) !== $store.state.settings.home &&
          $store.state.settings.necklace === true) ||
          view.mode === 'write'
      "
      :page="view.page"
    ></necklace>
    <div v-if="view.mode === 'play'">
      <mendeleev v-if="view.template === 'mendeleev'" :page="view.page"></mendeleev>
      <history v-else-if="view.template === 'history'" :page="view.page"></history>
      <player v-else :referent="view.page.reference" :is-page="true" :text="this.removeTitle(view.page.body)" :template="resolve(view.template)"></player>
    </div>
    <writer v-else-if="view.mode === 'write'" :view="view"></writer>
    <!--<wizard v-else-if="view.mode === 'form'" :view="view"></wizard>-->
    <!-- <player v-else-if="view.mode === 'form'" :view="view"></player> -->
    <history v-if="$store.state.sphere.id === 'izdubar'" :page="view.page"></history>
  </article>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import zevir from "@babouk/zevir";
import { View, Reference } from "@babouk/model";

import writer from "./writer.vue";
import mendeleev from "./mendeleev.vue";
import player from "../player.vue";
import necklace from "./necklace.vue";
import history from "./history.vue";

import utils from "../utils.js";

@Component({
  components: {
    history,
    necklace,
    mendeleev,
    player,
    writer,
  },
  mixins: [utils],
})
export default class Dispatcher extends Vue {
  @Prop({})
  view: View;
}
</script>
