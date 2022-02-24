import Vue from 'vue'
import vuex from 'vuex'
import VueCookies from 'vue-cookies'

import { Type, View, resolve, katonoma, Reference } from "@babouk/model";
import sam from "@babouk/sam";

Vue.use(vuex)
Vue.use(VueCookies);

const state = {
  count: 0,
  settings: { nav: {}, toolbar: false, styleIsLoaded: false }, // styleIsLoaded is to indicate if the stylesheet has been loaded by the browser
  // TODO: the state should list only the references to the eiee, not page objects themselves since it overloads the memory. + probably their titles,
  // and their save status
  views: [], // the list of open page views
  slides: {},
  concatenateSlides: false,
  // TODO: turn this into a reference or even page (in order to get access to its label)
  iiakhawunti: ".nn",
  locale: undefined,
  sphere: {},
  whakard: undefined, // list accounts this page follows, if any,
  dialog: {},
  mobile: true,
  menu: false,
  view: undefined, // the current active view. TODO: rename to "activeView"?
  properties: {}, // object used to store some data 
  playersReadyStates: {}, // Tracks the ready state of each player, in order to show them on screen only when they are ready indeed. The ready state is stored in the store, not in the component themselves, otherwise, updating their state fires a destroy and re-render.
}

const clearCookies = () => {
  Vue.$cookies.remove("login");
  Vue.$cookies.remove("token");
  // Vue.$cookies.remove("locale");
}

const mutations = {
  settings(state: any, settings: any) {
    state.settings = settings;
    state.settings.styleIsLoaded = true;
  },

  slides(state: any, slides: any) {
    // If 'concatenateSlides' is true, save slides in the store so that possible image macro instances further down in the document can use the data to display images. Add slides to existing ones stored in the slideshow that is present in the store,
    if (state.concatenateSlides && state.slides.slides !== undefined) {
      // state.slides.id = slides.id;
      state.slides.slides = state.slides.slides.concat(slides.slides);
    }
    else
      state.slides = slides;
  },

  onPagePlayerStart(state: any) {
    state.slides = {};
    state.concatenateSlides = false;
  },

  onSetConcatenateSlides(state: any) {
    state.concatenateSlides = true;

  },

  close(state: any, e: View) {
    // TODO: maybe add an equal method to page which returns true if the serialization is equal and the modes are the same (should we check the body as well?)
    const index = state.views.findIndex((item: View) => e.equals(item));
    if (index >= 0) {
      state.views.splice(index, 1);
    }
    // set current page as undefined
    //state.view = undefined;
  },
  // sets an active dialog
  dialog(state: any, config: any) {
    // if dialog is "ring", check first that there is an active page, otherwise it is irrelevant to open a ring dialog
    // TODO: for ring, do nothing if there is no active view
    // if (name === "ring" && state.view === undefined)
    //   return;
    state.dialog = config;
  },
  // sets the current active page
  async view(state: any, view: View) {
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
  },
  addView(state: any, view: View) {
    // in case the max number of tabs is reached, remove the first view before adding a new one
    if (state.settings.tabs !== undefined && state.settings.tabs.max !== undefined && state.views.length >= state.settings.tabs.max)
      state.views.shift();
    state.views.push(view);
  },
  // sets the current user
  setUser(state: any, userObj: any) {
    clearCookies();
    console.log("setUser", userObj);
    state.iiakhawunti = userObj.login;
    Vue.$cookies.set('login', userObj.login);
    if (userObj.token !== undefined)
      Vue.$cookies.set('token', userObj.token);
  },
  // TODO: move this to an action
  init(state: any) {
    Vue.$cookies.config('7d');
    state.locale = Vue.$cookies.get("locale");
    console.log("state locale", state);
    state.sphere = resolve(window.location.hostname, undefined, Type.SPHERE);
    //if (token != null && identifier != null) state.iiakhawunti = identifier;
    sam.signin(state.sphere).then((response: any) => {
      if (response.login != null) {
        state.iiakhawunti = response.login;
      } else {
        clearCookies();
      }
    }).catch((error: Error) => {
      // TODO: check that this is a JWT error indeed
      // This is likely a JWT error (but this should be checked) -> we remove the token cookie
      clearCookies();
    });
  },
  setLocale(state: any, locale: string) {
    Vue.$cookies.set('locale', locale);
    state.locale = locale;
  },
  menu(state: any) {
    state.menu = !state.menu;
  },
  mobile(state: any, isMobile: boolean) {
    let html = document.getElementsByTagName("html")[0];
    if (isMobile === true && state.settings.nav.bottom !== "never") {
      html.classList.add("has-navbar-fixed-bottom");
    } else {
      html.classList.remove("has-navbar-fixed-bottom");
    }
    state.mobile = isMobile;
  },
  // sets the current sphere, however not used at the moment
  sphere(state: any, sphere: Reference) {
    state.sphere = sphere;
  },

  properties(state: any, obj: any) {
    state.properties = obj;
  },

  ready(state: any, readyState: any) {
    if (readyState.ready === true)
      Vue.set(state.playersReadyStates, readyState.id, true); // needed for updating complex objects reactively
    else
      Vue.delete(state.playersReadyStates, readyState.id);
  }
}

const getters = {
  isSignedIn: (state: any): boolean => state.iiakhawunti !== ".nn" ? true : false
}

export default new vuex.Store({
  state,
  getters,
  mutations
})
