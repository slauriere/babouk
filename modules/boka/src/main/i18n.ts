import Vue from 'vue';
import i18n, { LocaleMessages } from 'vue-i18n';

import en from "../labels/en.json";
import fr from "../labels/fr.json";

Vue.use(i18n);

export default new i18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en: en, fr: fr }
});
