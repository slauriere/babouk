"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = __importDefault(require("vue"));
const i18n_js_1 = __importDefault(require("./i18n.js"));
const store_js_1 = __importDefault(require("./store.js"));
const index_vue_1 = __importDefault(require("../vues/index.vue"));
new vue_1.default({
    el: '#boka',
    i18n: i18n_js_1.default,
    render: h => h(index_vue_1.default),
    store: store_js_1.default
});
//# sourceMappingURL=index.js.map