<!-- main entry point of the application -->
<template>
  <div v-show="$store.state.settings.styleIsLoaded">
    <nav
      v-if="$store.state.settings.nav.top !== 'never' && katonoma(getActiveView()) !== 'l-etre-et-l-aimant'"
      class="container bd-navbar navbar is-spaced"
      :class="{ 'is-fixed-top': this.$store.state.mobile }"
    >
      <div class="navbar-brand">
        <div class="navbar-item">
          <div v-if="menu.length > 0" class="navbar-burger" :class="{ 'is-active': $store.state.menu }" @click="$store.commit('menu')">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <a
            v-if="$store.state.settings.logo != undefined"
            class="logo"
            href="/"
            @click="emit('page-open', resolve($store.state.settings.home))"
            v-on:click.prevent
          >
            <img :src="toMedia($store.state.settings.logo).url" alt="logo" />
          </a>
        </div>
        <xmenu v-if="$store.state.menu === true" :items="menu"></xmenu>
        <toolbar v-if="($store.state.settings.toolbar || $store.state.iiakhawunti !== '.nn') && !$store.state.mobile" :actions="actions" mode="top"> </toolbar>
        <div v-else class="navbar-item">
          <user-menu />
        </div>
      </div>
    </nav>
    <nav
      v-if="
        $store.state.settings.nav.bottom === 'always' ||
          ($store.state.settings.nav.bottom === 'mobile' && ($store.state.settings.toolbar || $store.state.iiakhawunti !== '.nn') && $store.state.mobile)
      "
      class="container bd-navbar navbar is-fixed-bottom"
    >
      <div class="navbar-brand">
        <toolbar mode="bottom" :actions="actions"></toolbar>
      </div>
    </nav>
    <main ref="views" :class="getClasses('views')">
      <tabs ref="tabs" v-show="$store.state.views.length > 0"></tabs>
    </main>
    <page-dialog v-if="$store.state.dialog.id === 'page'" @close="$store.commit('dialog', {})">
      <span slot="header">Information</span>
    </page-dialog>
    <signin-dialog v-if="$store.state.dialog.id === 'signin'" @close="$store.commit('dialog', {})">
      <span slot="header">{{ $t("iiak.signin-title") }}</span>
    </signin-dialog>
    <signup-dialog v-if="$store.state.dialog.id === 'signup'" @close="$store.commit('dialog', {})">
      <span slot="header">{{ $t("iiak.signup-title") }}</span>
    </signup-dialog>
    <search-dialog v-if="$store.state.dialog.id === 'open'" @close="$store.commit('dialog', {})">
      <span slot="header">{{ $t("page.open-or-create-title") }}</span>
    </search-dialog>
    <ring-dialog
      :page="getActiveView().page"
      v-if="$store.state.dialog.id === 'ring'"
      :relationId="$store.state.dialog.relation"
      :newRelatumType="$store.state.dialog.type"
      :ring="$store.state.dialog.ring"
      @close="$store.commit('dialog', {})"
    >
      <span slot="header">{{ getActiveView().page.title }}</span>
    </ring-dialog>
    <slideshow-dialog v-if="$store.state.dialog.id === 'slideshow'" @close="$store.commit('dialog', {})"> </slideshow-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Composition from "@vue/composition-api";
import VClickOutside from "v-click-outside";

import { Ker, Page, Reference, Ring, Type, View, katonoma, localize, normalize, resolve, resolveSet, urize } from "@babouk/model";

import sam from "@babouk/sam";

//import errors from "../main/errors";

import bus from "../main/bus";
import userMenu from "./user-menu.vue";
import keyz from "../main/keyz";
import menu from "./menu.vue";
import notification from "./notification.vue";
import ringDialog from "./ring/editor.vue";
import pageDialog from "./page/dialog.vue";
import searchDialog from "./dialogs/search.vue";
import signinDialog from "./user/signin-dialog.vue";
import signupDialog from "./user/signup-dialog.vue";
import slideshowDialog from "./dialogs/slideshow.vue";
import tabs from "./tabs.vue";
import toolbar from "./toolbar.vue";
import utils from "./utils.js";

Vue.use(Composition);
Vue.use(VClickOutside);

// TODO: see how to simplify this
const flashComponent = Vue.extend(notification);

@Component({
  components: {
    userMenu,
    pageDialog,
    xmenu: menu,
    searchDialog,
    signinDialog,
    signupDialog,
    slideshowDialog,
    tabs,
    toolbar,
    ringDialog,
  },
  mixins: [utils],
})
export default class Boka extends Vue {
  randomPageMode: string = "";
  clazz: string = "";

  isActionActive(): boolean {
    return this.$store.state.view !== undefined && this.$store.state.view.template !== "history";
  }

  actions = [
    { id: "page.open-or-create", intent: ["open-dialog", "open"], icon: "search" },
    {
      id: "page.random",
      intent: ["page-open-random"],
      icon: "random",
      isPresent: (): boolean => {
        return this.$store.state.settings.tabs !== undefined && this.$store.state.settings.tabs.max > 1;
      },
    },
    { id: "page.toggle-writer", intent: ["page-toggle-writer"], icon: "edit", isActive: this.isActionActive },
    {
      id: "page.toggle-wizard",
      intent: ["page-toggle-wizard"],
      icon: "form",
      isActive: this.isActionActive,
      isPresent: (): boolean => {
        return this.$store.state.settings.tabs !== undefined && this.$store.state.settings.tabs.max > 1;
      },
    },
    { id: "page.save", intent: ["page-save-active"], icon: "save", isActive: this.isActionActive },
    {
      id: "page.close",
      intent: ["page-close"],
      icon: "close",
      isActive: (): boolean => {
        return this.$store.state.view !== undefined;
      },
      isPresent: (): boolean => {
        return this.$store.state.settings.tabs !== undefined && this.$store.state.settings.tabs.max > 1;
      },
    },
    { id: "history.view", intent: ["page-open", undefined, "history"], icon: "history", isActive: this.isActionActive },
    { id: "page.delete", intent: ["page-delete"], icon: "trash", isActive: this.isActionActive },
  ];

  // menu = [
  //   { id: "decouverte", items: [{ id: "situation-geographique" }, { id: "acces" }] },
  //   { id: "vie-municipale", items: [{ id: "services" }, { id: "conseil-municipal" }] },
  // ];
  menu = [];

  activateView(view: View, historyn: boolean): void {
    // Close any dialog box if any (eg a map dialog box from which one opens a page)
    this.$store.commit("dialog", {});
    // TODO: see how to mutate an element in an array in Vuex
    this.$store.state.views.forEach((v: View) => {
      // NB: if the property is modified directly via (page.selected = ...), the component state is not reflected in the DOM.
      // Vue needs to be "manually informed" of a change.
      // See also: https://stackoverflow.com/questions/46985067/vue-change-object-in-array-and-trigger-reactivity
      if (view.equals(v)) {
        this.$set(v, "mode", view.mode);
        this.$set(v, "active", true);
        const sphereTitle = this.$store.state.settings.title;
        if (sphereTitle !== undefined) {
          if (katonoma(v) !== this.$store.state.settings.home) document.title = v.page.title + " – " + sphereTitle;
          else document.title = sphereTitle;
        } else {
          document.title = v.page.title !== undefined ? v.page.title : "";
        }
        //this.addOpenGraphProtocolTags(v.page);

        let state: any = { id: this.urize(v.page.reference) };
        // Add new entry to history only if the user is not navigating in the history at the moment
        if (historyn === true) {
          // Push new state to history so that:
          // 1) the activated view gets reflected in the URL
          // 2) the browser back/forward actions update the window URL based on the available entries in the history
          // NB:
          // - the URL has to be modified only if the page is not the home because for home we want to keep the plain domain name,
          // not suffixed with the page identifier.
          // - TODO: a new state should be pushed to history only if the current URL is not correct already
          window.history.pushState(state, this.urize(v.page.reference), katonoma(v) !== this.$store.state.settings.home ? this.serialize(v.page.reference) : "/");
          // dispatch event so that the apps gets informed of the new state
          // add the emitter info so that we can distinguish between states popping from the history or from the app itself
          window.dispatchEvent(new PopStateEvent("popstate", { state: Object.assign(state, { emitter: "boka" }) }));
        }
      } else {
        this.$set(v, "active", false);
      }
    });
    this.$store.commit("view", view);
  }

  getClasses(item?: string): string {
    let classes = "";
    if (item === "views") {
      // TODO: improve this hack: we add the identifier of the active page if any for possibly adding top level CSS rules depending on the current page
      // TODO: see how to prevent CSS or JavaScript injection via this method
      classes = `container content boka ${this.clazz}`.trim();
      if (this.$store.state.views !== undefined) {
        const view = this.getActiveView();
        if (view !== undefined) {
          let clazz = this.toClassName(katonoma(view));
          classes += " " + clazz;
        }
      }
    }
    return classes;
  }

  closeActiveView(): boolean {
    const view = this.getActiveView();
    if (view !== undefined) {
      this.$store.commit("close", view);
      // Using splice rather than direct reaffectation due to this caveat: https://vuejs.org/v2/guide/list.html#Caveats
      // See also: https://alligator.io/vuejs/iterating-v-for/
      const views = this.$store.state.views;
      if (views.length > 0) {
        this.activateView(views[0], true);
      } else {
        // if the list of views is empty, set the URL to home
        window.history.pushState({ id: "empty" }, "empty", "/");
        // and set current active view to undefined
        this.$store.commit("view", undefined);
      }
    }
    return false;
  }

  emit(eventName: string, ...args: any) {
    bus.$emit(eventName, ...args);
  }

  onResize() {
    this.$store.commit("mobile", window.innerWidth <= 769);
  }

  // resolve(id: string) {
  //   return this.resolve(id);
  // }

  // Not really needed since useful only when accessing a page directly from a URL, not opening it dynamically as a tab
  // addOpenGraphProtocolTags(e: Page): void {
  //   const meta = document.querySelectorAll("head meta[property]");
  //   let ogp: any = {};
  //   for (let i = 0; i < meta.length; i++) {
  //     const m = meta[i];
  //     const property = m.getAttribute("property");
  //     if (property != null) ogp[property] = m;
  //   }
  //   ogp["og:title"].setAttribute("content", e.title !== undefined ? e.title : "");
  //   ogp["og:url"].setAttribute("content", document.location.href);
  //   ogp["og:type"].setAttribute("content", "article");
  //   ogp["og:image"].setAttribute("content", "https://ruesacalie.paris/le-dit-des-rues-de-paris/media/le-dit-incipit.jpg");
  // }

  error(error: any): void {
    if (error && error.response && error.response.status) {
      const status = error.response.status;
      //const message = errors[status] ? errors[status].message : status;
      const message = status;
      this.flash("warning", "", `An error occurred: ${message}.`);
    } else {
      console.log(error.stack ? error.stack : error);
      this.flash("warning", "", error ? error.toString() : "error");
    }
  }

  flash(type: string, title: string, message: string): void {
    const propsData = {
      container: ".notifications",
      direction: "bottom",
      duration: 1888,
      message: message,
      title: title,
      type: type,
    };
    new flashComponent({
      el: document.createElement("div"),
      propsData,
    });
  }

  getActiveView(): View | undefined {
    const active = this.$store.state.views.filter((view: View) => view.active);
    if (active !== undefined && active.length > 0) {
      return active[0];
    } else {
      return undefined;
    }
  }

  getActivePage(): Page | undefined {
    const view = this.getActiveView();
    if (view !== undefined) return view.page;
    return undefined;
  }

  getView(referent: Reference, template: string): View | undefined {
    const name = katonoma(referent);
    const language = referent.language;
    const filtered = this.$store.state.views.filter(
      (view: View) => katonoma(view.page) === name && view.page.reference.language === language && view.template === template
    );
    if (filtered.length == 1) {
      return filtered[0];
    } else {
      return undefined;
    }
  }

  maybeCloseActiveView(): void {
    const view = this.getActiveView();
    if (view != undefined && view.saved === false) {
      // TODO: possibly create a dialog instead, with three return options: yes, no, cancel (save as is, save and close, cancel)
      this.flash("warning", "", "Page has to be saved before getting closed.");
    } else {
      this.closeActiveView();
    }
  }

  // Can be used either for translating a label, or for obtaining a Reference whose language is the one as the one of the current view, typically for creating links preserving the current page language
  localize(entity: string | Reference): any {
    if (typeof entity === "string") return this.$t(entity);
    else {
      const view = this.getActiveView();
      if (view !== undefined) {
        return localize(entity, view.page.reference.language);
      } else {
        return entity;
      }
    }
  }

  localurize(reference: Reference): string {
    const view = this.getActiveView();
    if (view !== undefined) {
      return urize(localize(reference, view.page.reference.language));
    } else {
      return urize(reference);
    }
  }

  mounted() {
    // Make sam available in the global scope for using it from custom javascripts in pages content
    let w = window as any;
    w.boka = this;
    w.sam = sam;
    w.parameters = this.getQueryStringParameters();

    this.$store.commit("init");

    window.addEventListener("resize", this.debounce(this.onResize, 100));

    // Obtain skin
    sam
      .getPage(this.resolve(".settings"))
      .then((page: Page) => {
        const settings = this.parse(page.body);

        // TODO: move this to default object
        // use Object.assign
        if (settings.toolbar === undefined) settings.toolbar = true;

        if (settings.nav === undefined) settings.nav = { top: "desktop", bottom: "mobile" };

        this.randomPageMode = settings["random-page-mode"] !== undefined ? settings["random-page-mode"] : this.randomPageMode;

        // TODO: move to dedicated method so that it's possible to add CSS dynamically
        if (settings.style !== undefined) {
          const element = this.registerStyle(this.toMedia(settings.style).url);
          // Wait for the stylesheet to be loaded by the browser
          // https://www.phpied.com/when-is-a-stylesheet-really-loaded/
          element.onload = () => {
            this.$store.commit("settings", settings);
          };
        } else {
          this.$store.commit("settings", settings);
        }

        if (this.$store.state.locale !== undefined) {
          this.$i18n.locale = this.$store.state.locale;
        } else {
          const locales = settings.locales;
          if (locales !== undefined && locales.length > 0) {
            this.$i18n.locale = locales[0];
            this.$store.commit("setLocale", locales[0]);
          }
        }

        this.clazz = settings["top-container-css-class"] != undefined ? settings["top-container-css-class"] : "";

        const actions = settings.actions;
        if (actions !== undefined) {
          this.actions = actions;
        }

        const menu = settings.menu;
        if (menu !== undefined) {
          this.menu = menu.map((item: any) => {
            return {
              reference: item.reference || normalize(item.label),
              label: item.label,
              items:
                item.items !== undefined
                  ? item.items.map((subitem: any) => {
                      return { reference: subitem.reference || normalize(subitem.label), label: subitem.label };
                    })
                  : undefined,
            };
          });
        }

        // Call onResize to make sure that the state is updated taking into account the settings defined in the settings object
        this.onResize();
        return settings;
      })
      .then(async (settings: any) => {
        // The open actions below pass parameter "historyn" as false as we don't add 'manually' the page to history of the
        // browser since it's already done by the browser itself. We only pass "true" when opening a new resource not from
        // the address bar but from the application itself.
        const pathname = window.location.pathname;
        const segments = pathname.split("/");
        if (segments.length >= 2 && segments[1].length > 0) {
          const ref = this.resolve(segments[1]);
          if (segments.length === 2) {
            // URL is '/:page' (including possibly '/.history')
            const template = await this.getTemplate(ref);
            bus.$emit("page-open", ref, false, template);
          } else if (katonoma(ref) === ".history") {
            // URL is '/.history/:commit1' or '/.history/:commit1/:commit2'
            ref.type = Type.SERVICE;
            const commit1 = resolve(segments[2], ref, Type.COMMIT);
            if (segments.length === 3) {
              // URL is '/.history/:commit1'
              bus.$emit("page-open", commit1, false, "history");
            } else if (segments.length === 4) {
              // URL: /.history/commit1/commit2
              const commit2 = resolve(segments[3], commit1, Type.COMMIT);
              bus.$emit("page-open", commit2, false, "history");
            }
          } else if (segments.length === 3 && segments[2] === "history") {
            // URL: /:page/umlando
            bus.$emit("page-open", ref, true, "history");
          }
        } else if (settings != undefined && settings.home != undefined) {
          // Open home defined in settings if any
          const e = this.resolve(settings.home);
          const template = await this.getTemplate(e);
          bus.$emit("page-open", e, false, template);
        }
      })
      .catch((err: Error) => {
        console.log("Error on loading the skin", err);
      });

    // TODO: obtaining the element via "this.$el" would be better but mousetrap won't work as expected with "this.$el"
    const boka = document.body;
    if (boka != null) keyz.setup(boka, this.$store);

    bus.$on("page-activate", (e: View) => {
      return this.activateView(e, true);
      // https://vuejs.org/v2/guide/reactivity.html#Async-Update-Queue
      // vue.nextTick(function() {
      // });
    });

    bus.$on("set-language", (locale: string) => {
      console.log("set-language", locale);
      this.$store.commit("language", locale);
    });

    bus.$on("open-dialog", (id: string, ...args: any) => {
      console.log("open-dialog", id, args);
      this.$store.commit("dialog", { id: id, parameters: args });
    });

    bus.$on("page-open-random", () => {
      sam
        .getRandomPage(this.$store.state.sphere)
        .then((page: Page) => {
          let v = this.getView(page.reference, "play");
          if (v === undefined) {
            v = new View(page, "default", "play");
            this.$store.commit("addView", v);
            this.activateView(v, true);
          }
          this.activateView(v, true);
        })
        .catch((error: Error) => this.error(error));
    });

    bus.$on("go", (id: string) => {
      document.location.href = id;
    });

    bus.$on("page-bok", () => {
      const view = this.getActiveView();
      if (view !== undefined) {
        return sam
          .bok(view.reference())
          .then((response: any) => {
            this.flash("success", "", "Exported");
          })
          .catch((error: Error) => this.error(error));
      }
    });

    bus.$on("page-close-active", () => {
      return this.maybeCloseActiveView();
    });
    bus.$on("page-create", (label: string, language: string) => {
      label = label.trim();
      const that = this;
      if (label.length == 0) return;
      sam
        .addPage(this.resolve(label, undefined, Type.PAGE, language))
        .then((response: any) => {
          if (response.reference !== undefined) {
            const referent = response.reference;
            bus.$emit("page-open", referent, true, "default", "write");
          } else {
            this.error(response.code);
          }
        })
        .catch((error: Error) => this.error(error));
    });

    bus.$on("page-close", (event: any) => {
      return this.closeActiveView();
    });

    bus.$on("page-delete", (event: any) => {
      const view = this.getActiveView();
      if (view) {
        return sam
          .scratch(view.reference())
          .then((response: any) => {
            this.flash("success", "", "Deleted");
            this.closeActiveView();
          })
          .catch((error: Error) => this.error(error));
      }
    });

    bus.$on("page-open", async (referent: Reference, historyn: boolean = true, template?: string, mode: string = "play") => {
      // eie can be undefined when the event is triggered from harap.vue in order to mean that the active one should be used
      if (referent === undefined) {
        const view = this.getActiveView();
        if (view !== undefined) referent = view.reference();
      }
      if (referent !== undefined) {
        if (template === undefined) {
          template = await this.getTemplate(referent);
        }
        const view = this.getView(referent, template);
        // Open only if not already open
        if (view === undefined) {
          return sam
            .getPage(referent)
            .then((p: Page) => {
              const v = new View(p, template !== undefined ? template : "default", mode);
              this.$store.commit("addView", v);
              this.deactivateDynamicStyles();
              this.activateView(v, historyn);
            })
            .catch((error: Error) => this.error(error));
        } else {
          return this.activateView(view, historyn);
        }
      }
    });

    bus.$on("page-toggle-writer", () => {
      const view = this.getActiveView();
      if (view !== undefined) {
        if (view.mode !== "write") view.mode = "write";
        else {
          if (view.saved === false) {
            // TODO: possibly create a dialog instead, with three return options: yes, no, cancel (save as is, save and close, cancel)
            this.flash("warning", "", "Page has to be saved before leaving the edit mode.");
          } else {
            view.mode = "play";
          }
        }
        this.activateView(view, true);
      }
    });

    bus.$on("page-toggle-wizard", () => {
      const view = this.getActiveView();
      if (view !== undefined) {
        if (view.mode !== "form") view.mode = "form";
        else {
          if (view.saved === false) {
            // TODO: possibly create a dialog instead, with three return options: yes, no, cancel (save as is, save and close, cancel)
            this.flash("warning", "", "Page has to be saved before leaving the edit mode.");
          } else {
            view.mode = "play";
          }
        }
        this.activateView(view, true);
      }
    });

    bus.$on("page-save", (body: string) => {
      const view = this.getActiveView();
      if (view !== undefined) {
        return sam
          .saveBody(view.reference(), { content: body })
          .then((response: any) => {
            this.$set(view, "saved", true);
            this.$set(view.page, "body", body);
            this.flash("success", "", "Saved");
          })
          .catch((error: Error) => this.error(error));
      }
    });

    bus.$on("page-save-active", () => {
      const view = this.getActiveView();
      if (view != undefined) bus.$emit(`page-save-${this.urize(view.page.reference)}`);
    });

    bus.$on("page-whakar", (z: Reference) => {
      const active = this.getActiveView();
      if (active) {
        // The referent is the current user, the relation has identifier ".whakar", the relatum is the active page.
        const referent = new Page(this.resolve(this.$store.state.iiakhawunti));
        const whakar = new Page(this.resolve(".whakar"));
        if (z === undefined) {
          bus.$emit("ring-save", {
            referent: referent,
            relation: whakar,
            relatum: active,
          });
        } else {
          const target = new Ring(z, referent, whakar);
          bus.$emit("ring-delete", target);
        }
        // activate the current activated page to reflect the new whakar status in the harap
        //this.$store.commit("eie", active.reference);
      }
    });

    bus.$on("error", (error: any) => {
      // TODO: we should display the full error message, not just the generic info message
      return this.error(error);
    });

    bus.$on("iiakhawunti-sign-in", () => {
      return this.$store.commit("dialog", { id: "signin" });
    });

    bus.$on("iiakhawunti-signed-in", (login: string, token: string) => {
      this.$store.commit("setUser", { login: login, token: token });
      this.flash("success", "", "Signed in!");
    });

    bus.$on("iiakhawunti-sign-out", () => {
      //this.clearCookies();
      bus.$emit("iiakhawunti-signed-out");
      this.$store.commit("setUser", { login: ".nn" });
      this.flash("success", "", "Signed out!");
    });

    bus.$on("iiakhawunti-sign-up", () => {
      return this.$store.commit("dialog", { id: "signup" });
    });

    bus.$on("iiakhawunti-signed-up", (iiakhawunti: string, token: string) => {
      // automatically sign in the newly registered user
      bus.$emit("iiakhawunti-signed-in", iiakhawunti, token);
      this.flash("success", "", "Signed up!");
    });

    bus.$on("media-add", (r: Reference, media: Array<string>) => {
      sam
        .addMediaFromForm(r, media)
        .then((response: any) => bus.$emit(katonoma(r) + "-media-created", response.data))
        .catch((err: Error) => this.error(err));
    });

    bus.$on("media-delete", (s: Reference): void => {
      if (s != undefined) {
        // TODO: sam should work with references as input, not ids
        sam
          .scratch(s)
          .then((result: Reference) => {
            console.log("media-delete", result);
            // TODO: check the reference is valid
            bus.$emit(katonoma(result.set) + "-media-deleted", result);
          })
          .catch((error: Error) => this.error(error));
      }
    });

    bus.$on("ring-save", async (r: Ring, options?: any) => {
      console.log("ring-save", r, options);
      if (r.referent != null && r.relation != null && (r.relatum != null || r.value != null)) {
        // TODO: use real ring structure here, not a json object
        // if options.relatum.create is true, first create the target relatum, optionally give it also a type
        // TODO: see how to handle error
        if (
          options !== undefined &&
          options.relatum !== undefined &&
          options.relatum.create === true &&
          r.relatum !== undefined &&
          r.relatum.title !== undefined
        ) {
          try {
            r.relatum = await sam.addPage(this.resolve(r.relatum.title));
            if (r.relatum !== undefined && options.relatum.type !== undefined) {
              const isA = new Page(this.resolve(Ker.IS_A));
              const targetType = new Page(this.resolve(options.relatum.type));
              const isARing = new Ring(resolve("", r.relatum.reference, Type.RING), r.relatum, isA, targetType);
              await sam.saveRing(isARing);
            }
          } catch (error) {
            this.error(error);
            return;
          }
        }
        sam
          .saveRing(r)
          // TODO: should the event emit be here or in sam function directly?
          // TODO: the ring should be returned from the service
          .then((response: any) => {
            bus.$emit(katonoma(r.referent) + "-ring-saved", response);
          })
          .catch((error: Error) => this.error(error));
        //}
      } else {
        this.flash("warning", "", "It seems the ring was incomplete, please make sure to select one relation and one relatum.");
      }
    });

    bus.$on("ring-delete", (z: Ring): void => {
      if (z != undefined && z.referent != undefined) {
        // TODO: sam should work with references as input, not ids
        sam
          .scratch(z.reference)
          .then((response: any) => bus.$emit(katonoma(z.referent) + "-ring-deleted", z))
          .catch((error: Error) => this.error(error));
      }
    });

    window.onpopstate = (event: any) => {
      console.log("location: " + document.location + ", state: " + JSON.stringify(event.state));
      // In case the event is not dispatched from the application itself (e.g. when a tab gets active via a click) but
      // from an history change, reflect the new URL into the app state
      if (event.state != null && event.state.emitter !== "boka") {
        bus.$emit("page-open", this.resolve(event.state.id), false);
      }
    };
  }
  beforeDestroy(): void {
    // TipTap: this.editor.destroy()
    const boka = document.body;
    if (boka != null) keyz.unsetup(boka);

    window.removeEventListener("resize", this.onResize);
  }

  //created() {
  //this.onResize();
  //}
  /**
   * Gets the default view template for the given eie.
   */
  async getTemplate(page: Reference): Promise<string> {
    const id = katonoma(page);
    if (id === ".history") {
      return "history";
    } else if (id === "l-etre-et-l-aimant") {
      return "mendeleev";
    } else {
      const rings = await sam.getRings(page, resolveSet([".is-a", ".has-template"], this.$store.state.sphere));
      console.log("[template]: Rings", rings);
      if (rings.length > 0 && rings[0].relatum !== undefined) {
        return katonoma(rings[0].relatum.reference);
      }
      // In case the page has no template, we look into the skin to check if there is a default template for pages
      if (this.$store.state.settings.templates !== undefined) {
        return this.$store.state.settings.templates.page;
      }
      return "default";
    }
  }
}
</script>
