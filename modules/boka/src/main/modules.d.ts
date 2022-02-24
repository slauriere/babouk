// https://github.com/DanielRosenwasser/typescript-vue-tutorial
// https://github.com/vuejs/vue/issues/5298

declare module "*.vue" {
  import Vue from "vue";
  export default Vue;
}

declare module "js-yaml";
declare module "leaflet";
declare module "mousetrap";
declare module "v-click-outside";
declare module "vue-bulma-ui";
declare module "vue-codemirror";
declare module "vue-swatches";
// declare module "vue-async-computed";
declare module "vue-social-sharing";

// TODO: see to make these modules self-declare
declare module "@babouk/sam";
declare module "@babouk/zevir";
declare module "vue-twentytwenty";
