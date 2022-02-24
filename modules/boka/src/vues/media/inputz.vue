<!-- input field for adding one or several file(s) -->
<template>
  <div class="control">
    <div class="tags">
      <div class="file-label">
        <input type="file" title="Add files" class="file-input" multiple v-on:change="send" style="cursor: pointer;" />
        <a href class="tag is-primary add-media">
          <span class="icon is-small add-media"></span>
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";
import { Reference } from "@babouk/model";

import bus from "../../main/bus";

@Component({
  components: {},
})
export default class Inputz extends Vue {
  @Prop({})
  reference: Reference;

  send(e: Event) {
    const target: any = e.target;
    bus.$emit("media-add", this.reference, target.files);
  }
}
</script>
