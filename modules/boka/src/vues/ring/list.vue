<!-- list of rings represented as kusoks, and a dialog for adding a ring -->
<template>
  <div class="rings">
    <!-- TODO: the rings should be ordered on the server side -->
    <!-- we display first the rings involving direct relations (i.e. those having the current page as referent) -->
    <div class="field is-grouped is-grouped-multiline">
      <item
        v-for="(ring, index) in getRings(page, true)"
        :key="`${katonoma(page)}-ring-${index}`"
        :editable="page.editable"
        :reference="page.reference"
        :ring="ring"
      ></item>
      <item
        v-for="(ring, index) in getRings(page, false)"
        :key="`${katonoma(page)}-ring-inverse-${index}`"
        :editable="page.editable"
        :reference="page.reference"
        :ring="ring"
      ></item>
      <div v-if="page.editable" class="control">
        <div class="tags">
          <a title="Add characteristic" class="tag is-primary add-ring" @click="$store.commit('dialog', { id: 'ring' })" style="text-decoration: none;">
            <span class="icon is-small add-ring"> </span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { Page, Reference, Ring, Type, katonoma } from "@babouk/model";
import sam from "@babouk/sam";

import utils from "../utils.js";
import bus from "../../main/bus";
import item from "./item.vue";

@Component({
  mixins: [utils],
  components: { item },
})
export default class Rings extends Vue {
  @Prop({})
  page: Page;

  @Prop({})
  mode: string;

  //@Prop({})
  relation: string | undefined = undefined;

  //@Prop({})
  types = new Array<string>();

  //@Prop({})
  sort: string | undefined = undefined;

  rings = new Array<Ring>();

  mounted(): void {
    if (this.page !== undefined) this.initialize(this.page);
  }

  initialize(p: Page): void {
    sam
      .getRings(p.reference, this.relation, undefined, this.types !== undefined && this.types.length > 0 ? this.types : undefined, 0, this.sort)
      .then((rings: Ring[]) => {
        // TODO: we may use in-place replacemeent instead, see vuejs list caveats
        this.rings = rings;
      });

    // Remove listenters first, otherwise they can be added several times, not sure why
    // TODO: check it is ok
    //bus.$off(katonoma(this.page) + "-ring-saved");
    //bus.$off(katonoma(this.page) + "-ring-deleted");

    bus.$on(katonoma(p) + "-ring-saved", async (ring: Ring) => {
      console.log(katonoma(p) + "ring-saved", ring);
      if (ring !== undefined && katonoma(ring) !== undefined) {
        if (this.relation === undefined) {
          const existing = this.rings.filter((item: any) => katonoma(item) === katonoma(ring));
          if (existing !== undefined && existing.length > 0) {
            //existing[0] = ring;
            this.$set(existing[0], "relation", ring.relation);
            this.$set(existing[0], "relatum", ring.relatum);
            this.$set(existing[0], "value", ring.value);
            this.$set(existing[0], "properties", ring.properties);
          } else this.rings.push(ring);
        } else if (katonoma(ring.relation.reference) === this.relation) {
          // this is for the wizard mode in case only rings with a given relation are displayed
          if (this.types !== undefined && this.types.length > 0 && ring.relatum !== undefined) {
            const rings2 = await sam.getRings(ring.relatum.reference, ".is-a");
            // TODO: this works only with pages having just one type (since we retrieve only the first one)
            if (rings2.length > 0 && this.types.some((t) => t === katonoma(rings2[0].relatum.reference))) {
              this.rings.push(ring);
            }
          } else {
            this.rings.push(ring);
          }
        }
      }
    });

    // Listen to zafu removal
    bus.$on(katonoma(p) + "-ring-deleted", (z: Ring) => {
      // TODO: the type should be checked: there's no use handling zafu suppression when the type is "media"
      if (z != undefined && katonoma(z) != undefined) {
        // TODO: we may use in-place replacemeent instead, see vuejs list caveats
        this.rings = this.rings.filter((item) => katonoma(item) != katonoma(z));
      }
    });
  }

  // Returns direct or inverse rings, optionally filtered by a specific relation
  getRings(p: Page, direct: boolean): Ring[] {
    if (direct === true) {
      return this.rings.filter((item) => katonoma(item.referent) === katonoma(p));
    } else {
      return this.rings.filter((item) => item.relatum && katonoma(item.relatum) === katonoma(p));
    }
  }
}
</script>
