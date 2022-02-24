<!-- resource viewer -->
<template>
  <div class="necklace">
    <!-- The "key" element is needed to differentiate between the various zafus and media component instances that live in the page, because they are part of their parent "v-for". Otherwise typically, when closing a given tab, the other tab zafus are wrong. -->
    <!-- TODO: at the moment, the zafus and media are re-fetched when a tab is updated, i.e. typically when another one is closed. We may want to keep the zafus and media in memory without the need to re-fetch them on tab close -->
    <rings :page="page" v-if="true"></rings>
    <media :page="page"></media>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { Page } from "@babouk/model";

import media from "../media/list.vue";
import rings from "../ring/list.vue";

@Component({
  components: {
    media,
    rings,
  },
})
export default class Necklace extends Vue {
  @Prop({})
  page: Page;

}
</script>
