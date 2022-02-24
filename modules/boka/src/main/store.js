"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = __importDefault(require("vue"));
const vuex_1 = __importDefault(require("vuex"));
const vue_cookies_1 = __importDefault(require("vue-cookies"));
const model_1 = require("@babouk/model");
const sam_1 = __importDefault(require("@babouk/sam"));
vue_1.default.use(vuex_1.default);
vue_1.default.use(vue_cookies_1.default);
const state = {
    count: 0,
    settings: { nav: {}, toolbar: false, styleIsLoaded: false },
    // TODO: the state should list only the references to the eiee, not page objects themselves since it overloads the memory. + probably their titles,
    // and their save status
    views: [],
    slides: {},
    concatenateSlides: false,
    // TODO: turn this into a reference or even page (in order to get access to its label)
    iiakhawunti: ".nn",
    locale: undefined,
    sphere: {},
    whakard: undefined,
    dialog: {},
    mobile: true,
    menu: false,
    view: undefined,
    properties: {},
    playersReadyStates: {},
};
const clearCookies = () => {
    vue_1.default.$cookies.remove("login");
    vue_1.default.$cookies.remove("token");
    // Vue.$cookies.remove("locale");
};
const mutations = {
    settings(state, settings) {
        state.settings = settings;
        state.settings.styleIsLoaded = true;
    },
    slides(state, slides) {
        // If 'concatenateSlides' is true, save slides in the store so that possible image macro instances further down in the document can use the data to display images. Add slides to existing ones stored in the slideshow that is present in the store,
        if (state.concatenateSlides && state.slides.slides !== undefined) {
            // state.slides.id = slides.id;
            state.slides.slides = state.slides.slides.concat(slides.slides);
        }
        else
            state.slides = slides;
    },
    onPagePlayerStart(state) {
        state.slides = {};
        state.concatenateSlides = false;
    },
    onSetConcatenateSlides(state) {
        state.concatenateSlides = true;
    },
    close(state, e) {
        // TODO: maybe add an equal method to page which returns true if the serialization is equal and the modes are the same (should we check the body as well?)
        const index = state.views.findIndex((item) => e.equals(item));
        if (index >= 0) {
            state.views.splice(index, 1);
        }
        // set current page as undefined
        //state.view = undefined;
    },
    // sets an active dialog
    dialog(state, config) {
        // if dialog is "ring", check first that there is an active page, otherwise it is irrelevant to open a ring dialog
        // TODO: for ring, do nothing if there is no active view
        // if (name === "ring" && state.view === undefined)
        //   return;
        state.dialog = config;
    },
    // sets the current active page
    view(state, view) {
        return __awaiter(this, void 0, void 0, function* () {
            state.view = view;
            console.log("active", view);
            // Calling getSphere() won't work, not sure why
            // if (reference.set !== undefined && katonoma(reference.set) === "izdubar") {
            //   const rings = await sam.search(undefined, { referent: state.iiakhawunti, relation: ".whakar", relatum: katonoma(reference) });
            //   if (rings != undefined && rings.length > 0) {
            //     // whakard means "is followed", and if there is a ring indeed, we store its reference in the variable "state.whkard", otherwise that variable is set to undefined
            //     state.whakard = rings[0].reference;
            //   } else {
            //     state.whakard = undefined;
            //   }
            // }
        });
    },
    addView(state, view) {
        // in case the max number of tabs is reached, remove the first view before adding a new one
        if (state.settings.tabs !== undefined && state.settings.tabs.max !== undefined && state.views.length >= state.settings.tabs.max)
            state.views.shift();
        state.views.push(view);
    },
    // sets the current user
    setUser(state, userObj) {
        clearCookies();
        console.log("setUser", userObj);
        state.iiakhawunti = userObj.login;
        vue_1.default.$cookies.set('login', userObj.login);
        if (userObj.token !== undefined)
            vue_1.default.$cookies.set('token', userObj.token);
    },
    // TODO: move this to an action
    init(state) {
        vue_1.default.$cookies.config('7d');
        state.locale = vue_1.default.$cookies.get("locale");
        console.log("state locale", state);
        state.sphere = model_1.resolve(window.location.hostname, undefined, model_1.Type.SPHERE);
        //if (token != null && identifier != null) state.iiakhawunti = identifier;
        sam_1.default.signin(state.sphere).then((response) => {
            if (response.login != null) {
                state.iiakhawunti = response.login;
            }
            else {
                clearCookies();
            }
        }).catch((error) => {
            // TODO: check that this is a JWT error indeed
            // This is likely a JWT error (but this should be checked) -> we remove the token cookie
            clearCookies();
        });
    },
    setLocale(state, locale) {
        vue_1.default.$cookies.set('locale', locale);
        state.locale = locale;
    },
    menu(state) {
        state.menu = !state.menu;
    },
    mobile(state, isMobile) {
        let html = document.getElementsByTagName("html")[0];
        if (isMobile === true && state.settings.nav.bottom !== "never") {
            html.classList.add("has-navbar-fixed-bottom");
        }
        else {
            html.classList.remove("has-navbar-fixed-bottom");
        }
        state.mobile = isMobile;
    },
    // sets the current sphere, however not used at the moment
    sphere(state, sphere) {
        state.sphere = sphere;
    },
    properties(state, obj) {
        state.properties = obj;
    },
    ready(state, readyState) {
        if (readyState.ready === true)
            vue_1.default.set(state.playersReadyStates, readyState.id, true); // needed for updating complex objects reactively
        else
            vue_1.default.delete(state.playersReadyStates, readyState.id);
    }
};
const getters = {
    isSignedIn: (state) => state.iiakhawunti !== ".nn" ? true : false
};
exports.default = new vuex_1.default.Store({
    state,
    getters,
    mutations
});
//# sourceMappingURL=store.js.map