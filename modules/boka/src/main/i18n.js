"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = __importDefault(require("vue"));
const vue_i18n_1 = __importDefault(require("vue-i18n"));
const en_json_1 = __importDefault(require("../labels/en.json"));
const fr_json_1 = __importDefault(require("../labels/fr.json"));
vue_1.default.use(vue_i18n_1.default);
exports.default = new vue_i18n_1.default({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en: en_json_1.default, fr: fr_json_1.default }
});
//# sourceMappingURL=i18n.js.map