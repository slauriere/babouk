<template functional>
  <div>
    <h1>
      <slot></slot>
    </h1>
    <ul>
      <li v-for="(item, index) in ['alpha', 'beta', 'gamma']" :key="index">{{ item }}</li>
    </ul>
  </div>
</template>
<script lang="ts">
import vue from "vue";
import {Component, Prop, Vue} from "vue-property-decorator";

@Component({
  components: {},
})
export default class sandbox extends Vue {
  mounted(): void {
    console.log("slots", this.$slots);
  }
}
</script>
