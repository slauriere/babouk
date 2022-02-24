<!-- dialog box for adding a ring -->
<template>
  <div class="modal is-active edit-ring">
    <div @click="close" class="modal-background"></div>
    <div class="modal-card" :class="{ 'has-image-image': this.relation != null && this.relation !== undefined && this.relation.image === 'image' }">
      <header class="modal-card-head">
        <div class="modal-card-title">
          <slot name="header">Title</slot>
        </div>
        <button @click="close" aria-label="close" class="delete"></button>
      </header>
      <section class="modal-card-body" :class="{ 'has-constrained-relation': relationId !== undefined }">
        <slot name="body"></slot>
        <div class="columns is-multiline is-mobile">
          <div class="column is-12-mobile is-6-tablet ring-relation" v-show="relationId === undefined">
            <multiselect
              :custom-label="getLabel"
              deselect-label=""
              id="relation-input"
              :internal-search="true"
              :loading="isLoadingRelations"
              v-model="relation"
              :multiple="false"
              open-direction="bottom"
              :options="relations"
              :options-limit="127"
              :searchable="true"
              @select="onRelationSelect"
              select-label=""
              :show-no-results="false"
              :show-no-options="false"
              placeholder="Relation"
              ref="relationSelector"
              track-by="reference"
            ></multiselect>
          </div>
          <div class="column is-12-mobile is-6-tablet ring-relatum">
            <!-- v-show is used rather than v-if because the former fires refs.search error in the multiselect component when the relation is null -->
            <multiselect
              :custom-label="getLabel"
              deselect-label=""
              id="relatum-input"
              :internal-search="false"
              :loading="isLoadingRelata"
              v-model="relatum"
              :multiple="false"
              open-direction="bottom"
              :options="relata"
              :options-limit="1000"
              placeholder="Type to search"
              ref="relatumInput"
              @search-change="onRelatumSearch"
              :searchable="true"
              @select="onRelatumSelect"
              select-label=""
              :show-no-results="false"
              :show-no-options="false"
              @tag="onRelatumSelectNew"
              tag-placeholder="+"
              :taggable="true"
              track-by="reference"
              v-show="relation == null || !['color', 'image', 'object', 'string'].includes(relation.image)"
            ></multiselect>
            <textarea
              v-if="relation != null && ['object', 'string'].includes(relation.image)"
              :class="`input is-primary textarea has-image-${relation.image} ring-value`"
              id="value-input"
              v-model="value"
              placeholder=""
              ref="valueInput"
              type="text"
              rows="3"
            />
            <textarea
              v-else-if="relation != null && relation.image === 'image'"
              class="input is-primary has-image-image textarea ring-value"
              id="value-image-input"
              v-model="value"
              placeholder=""
              ref="imageInput"
              type="text"
              @keyup="searchImages"
              rows="3"
            />
          </div>
          <div v-if="relation.image === 'image' && images !== undefined && images.length > 0" class="column is-12-mobile is-12-tablet">
            <!-- TODO: the list of images could actually get listed directly in a multiselect displaying images -->
            <div class="field is-grouped is-grouped-multiline" style="justify-content: space-evenly">
              <!-- TODO: check if this is an issue that the key is the imageIndex, hence several elements with same key in case of several tabs? -->
              <a v-for="(image, index) in images" :href="image.url" :key="index" v-on:click.prevent @click="selectImage(image.reference)">
                <img class="thumbnail" :src="getThumbnail(image)" />
              </a>
            </div>
          </div>
          <div v-else-if="relation.iamge === 'color'" class="column is-12-mobile is-12-tablet">
            <v-swatches v-model="value" inline popover-x="left" popover-y="bottom"></v-swatches>
          </div>
          <div
            v-if="isSphere('bluelion') || isSphere('chelouchegallery') || isSphere('christov.xyz')"
            class="column is-12-mobile is-12-tablet"
            v-show="relationId === undefined"
          >
            <textarea
              class="textarea is-primary ring-properties"
              id="properties-input"
              v-model="properties"
              placeholder=""
              ref="propertiesInput"
              rows="2"
            ></textarea>
          </div>
        </div>
      </section>
      <footer class="modal-card-foot">
        <button @click="save" class="button is-success">Save</button>
        <button @click="close" class="button">Cancel</button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import mousetrap from "mousetrap";
import multiselect from "vue-multiselect";
import { Component, Prop, Vue } from "vue-property-decorator";
import vSwatches from "vue-swatches";
import "vue-swatches/dist/vue-swatches.css";

import { Ker, Page, Relation, Reference, katonoma, resolve, Ring, shortify, Type } from "@babouk/model";

import sam from "@babouk/sam";
import bus from "../../main/bus";
import utils from "../utils.js";

@Component({
  mixins: [utils],
  components: {
    multiselect,
    vSwatches,
  },
})
export default class RingEdit extends Vue {
  @Prop({})
  page: Page;

  @Prop({})
  ring: Ring; // ring getting updated in case it's an update

  // Property used in case we want to force a specific relation and let the user only choose a relatum or value
  @Prop({})
  relationId: string;

  // Property used in case we want to automatically give a specific type to a newly created relatum
  @Prop({})
  newRelatumType: string;

  relations = new Array<Relation>();
  relata = new Array<Page>();
  images = new Array<Reference>();
  isLoadingRelations = false;
  isLoadingRelata = false;
  isLoadingImages = false;
  // TODO: Vue requires that reactive properties get initialized as something different than undefined. Possibly introduce an empty reference and empty page in abok?
  // The currently selected relation
  relation = new Relation(resolve(""));
  // The selected relatum, if any
  relatum = new Page(resolve(""));
  value = "";
  properties = "";

  // Indicates if it's a relatum to be created or an existing one
  isNewRelatum = false;

  beforeDestroy(): void {
    mousetrap.unbind("esc");
  }

  close(): void {
    this.$emit("close");
  }

  getLabel(e: Page): string {
    return e.title != undefined ? e.title : "";
  }

  onRelationSelect(relation: Relation): void {
    this.relation = relation;
    // When the "is a" relation is selected, load all existing types
    if (relation !== undefined && katonoma(relation) === Ker.IS_A) {
      this.onRelatumSearch("");
    } else {
      this.relata = [];
    }
    // Give the focus to the relatum field, either a plain text input or a multiselect depending ont the relation's image, but after some
    // delay only so that the inner components have time to get updated first (i.e. getting shown / hidden / activated / inactivated).
    if (relation !== undefined && ["string", "object"].includes(relation.image)) {
      setTimeout(() => {
        const input = document.getElementById("value-input");
        if (input != null) input.focus();
      }, 50);
    } else if (relation !== undefined && ["image"].includes(relation.image)) {
      setTimeout(() => {
        const input = document.getElementById("value-image-input");
        if (input != null) input.focus();
        if (this.ring !== undefined && this.ring.value !== undefined) this.value = this.ring.value;
      }, 50);
    } else {
      setTimeout(() => {
        //if (this.$refs.relatumInput != null) (this.$refs.relatumInput as any).focus();
        const input = document.getElementById("relatum-input");
        if (input != null) input.focus();
      }, 50);
    }
  }

  onRelatumSearch(text: string): void {
    // Launch a search only if the selected relation is "izu" or if the relatum input field is not empty
    if ((this.relation != undefined && katonoma(this.relation) === Ker.IS_A) || (text != null && text.trim().length > 0)) {
      this.isLoadingRelata = true;
      //const relationId = this.relation != undefined ? katonoma(this.relation) : undefined;
      sam.searchRelatum(this.relation.reference, text).then((results: Page[]) => {
        this.relata = results;
        this.isLoadingRelata = false;
      });
    }
  }

  onRelatumSelect(relatum: Reference): void {
    console.log("onRelatumSelect", relatum);
    this.isNewRelatum = false;
  }

  onRelatumSelectNew(label: string): void {
    console.log("onRelatumSelectNew", label);
    this.relatum = new Page(this.resolve(label));
    this.isNewRelatum = true;
  }

  mounted(): void {
    console.log("ring editor", this.ring);
    mousetrap.bind("esc", this.close);
    this.isLoadingRelations = true;
    //let that = this;

    // The code below can be used to create the system pages: relation, is-a, has-link-with, type
    /*sam.search("i").then(function(results) {
      dialog.relations = results;
      dialog.isLoadingRelations = false;
    });*/

    sam.getRelations(this.page.reference).then((entries: Relation[]) => {
      this.relations = entries;
      this.isLoadingRelations = false;
      // TODO: use refs?
      if (this.ring !== undefined) {
        const filtered = this.relations.filter((rel) => katonoma(rel) === katonoma(this.ring.relation));
        if (filtered.length > 0) {
          this.relation = filtered[0];
        }
        if (this.ring.relatum !== undefined) this.relatum = this.ring.relatum;
        else if (this.ring.value !== undefined) {
          if (this.relation !== undefined && this.relation.image === "object") this.value = this.yamlize(this.ring.value);
          else this.value = this.ring.value;
        }
        if (this.ring.properties !== undefined) {
          this.properties = this.yamlize(this.ring.properties);
        }
      } else if (this.relationId !== undefined) {
        const filtered = this.relations.filter((rel) => katonoma(rel) === this.relationId);
        if (filtered.length > 0) {
          this.relation = filtered[0];
        }
      } else {
        const relationInput = document.getElementById("relation-input");
        if (relationInput != null) relationInput.focus();
      }
    });

    //this.$refs.relatumSelector.$el.focus();
  }

  save(): void {
    let value = this.value.trim();
    if (value.length > 0) {
      if (this.relation.image === "object") {
        try {
          value = this.parse(value);
        } catch (err) {
          alert(err);
          return;
        }
      }
    }
    let properties = this.properties.trim();
    if (properties.length > 0) {
      try {
        properties = this.parse(properties);
      } catch (err) {
        alert(err);
        return;
      }
    }
    this.close();
    // TODO: consider creating a ring: ring = new Ring()
    const ring = {
      reference: this.ring !== undefined ? this.ring.reference : undefined,
      referent: this.page,
      relation: this.relation,
      relatum: katonoma(this.relatum) !== "" ? this.relatum : undefined,
      value: value !== "" ? value : undefined,
      properties: properties !== "" ? properties : undefined,
    };
    bus.$emit("ring-save", ring, { relatum: { create: this.isNewRelatum, type: this.newRelatumType } });
  }

  searchImages(): void {
    if (this.value !== undefined && this.value.trim().length > 0) {
      this.isLoadingImages = true;
      this.images = [];
      sam
        .searchImages(this.value)
        .then((images: Array<Reference>) => {
          images.forEach((image) => {
            this.images.push(this.toMedia(image));
          });
          this.isLoadingImages = false;
        })
        .catch((error: Error) => {
          this.isLoadingImages = false;
          bus.$emit("error", error);
        });
    } else {
      this.images = [];
    }
  }

  selectImage(image: Reference) {
    if (this.page !== undefined && this.relation !== undefined && image !== undefined) {
      // TODO: new rings should have no reference
      //const r = new Ring(resolve("", this.page.reference, Type.RING), this.page, this.relation, undefined, serialize(image));
      const ring = {
        referent: this.page,
        relation: this.relation,
        value: shortify(image),
      };
      console.log("create ring", ring);
      bus.$emit("ring-save", ring);
      this.close();
    }
  }
}
</script>
