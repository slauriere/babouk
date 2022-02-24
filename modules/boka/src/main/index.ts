"use strict";

import Vue from 'vue'
import i18n from "./i18n.js";
import store from "./store.js";
import index from "../vues/index.vue";

new Vue({
  el: '#boka',
  i18n,
  render: h => h(index),
  store: store
})
