import yaml from "js-yaml";
import { Component, Vue } from "vue-property-decorator";
import dayjs from "dayjs";

import { katonoma, Reference, resolve, Type, urize, serialize } from "@babouk/model";
import zevir from "@babouk/zevir";

import bus from "../main/bus";

declare module "vue/types/vue" {
  interface Vue {
    arrayize(arg: any): any[];
    debounce(func: Function, wait: number, immediate?: boolean): any;
    emit(eventName: string, ...args: any): void;
    getImageExtensions(): string[];
    getQueryStringParameterValue(name: string): any;
    getThumbnail(image: any): string;
    htmlize(markdown: string): string;
    parseNodeBody(): any;
    getQueryStringParameters(): any;
    getSlotAsText(): string;
    isImage(ref: Reference): boolean;
    isSphere(name: string): boolean;
    katonoma(r: Reference): string;
    parse(text: string): any;
    removeTitle(body: string): string;
    deactivateDynamicStyles(): void;
    resolve(name: string, set?: Reference, t?: Type, language?: string): Reference;
    registerStyle(url: string, dynamic?: boolean): HTMLElement;
    resolveMedia(ref: string): Reference;
    toArticle(text: string): any;
    toMedia(image: Reference | string): any;
    toClassName(input: string): string;
    urize(ref: Reference): string;
    serialize(ref: Reference): string;
    yamlize(obj: any): string;
    formatTime(time: number): string;
  }
}

const imageExtensions = [".gif", ".jpg", ".jpeg", ".png", ".svg", ".tiff"];

@Component
export default class Utils extends Vue {

  /** Adds a header to the head tag. */
  addHeader(element: Element): void {
    document.getElementsByTagName("head")[0].appendChild(element);
  }

  removeHeader(element: Element): void {
    console.log("removing header", element);
    document.getElementsByTagName("head")[0].removeChild(element);
  }

  registerStyle(url: string, dynamic: boolean = false): HTMLElement {
    const pageId = location.pathname.replace(/^\//m, "");
    // Check the CSS is not already registered
    // if (dynamic) {
    //   const match = document.querySelector("link[data-page=\"" + pageId + "\"]");
    //   if (match != null)
    //     return;
    // }
    const element = document.createElement("link");
    element.rel = "stylesheet";
    element.type = "text/css";
    if (dynamic === true)
      element.setAttribute("data-page", pageId);
    element.href = url;
    this.addHeader(element);
    return element;
  }

  formatTime(time: number, format: string = "YYYY-MM-DD HH:mm"): string {
    return dayjs(time).format(format);
  }

  /** Remove custom styles which were included dynamically for specific pages. */
  deactivateDynamicStyles(): void {
    const matches = document.querySelectorAll("link[data-page]");
    console.log("matches", matches);
    for (const match of matches) {
      this.removeHeader(match);
      //match.setAttribute("disabled", "disabled");
    }
  }

  debounce(func: Function, wait: number, immediate?: boolean): any {
    let timeout: any = undefined;
    return function (this: any) {
      let context = this,
        args = arguments,
        later = function () {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  toClassName(input: string): string {
    // A class name must begin with an underscore (_), a hyphen (-), or a letter(a–z).
    return input.replace(/^[\.\d]+/m, "-");
  }

  arrayize(arg: any): any[] {
    if (Array.isArray(arg))
      return arg;
    else if (arg !== undefined)
      return [arg];
    else
      return [];
  }

  emit(eventName: string, ...args: any): void {
    console.log("emit", eventName, args);
    // in case we're opening a page via its id, turn the id into a reference first
    if (eventName === "page-open") {
      const reference = resolve(args[0], this.$store.state.sphere);
      console.log(args);
      bus.$emit(eventName, reference, true, ...args.slice(1));
    } else if (eventName !== undefined) {
      bus.$emit(eventName, ...args);
    }
  }

  getQueryStringParameterValue(name: string): any {
    const params = this.getQueryStringParameters();
    return params.get(name);
  }

  getQueryStringParameters(): URLSearchParams {
    // https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
    return new URLSearchParams(location.search);
  }

  getImageExtensions(): string[] {
    return imageExtensions;
  }

  // Needed when called from a Markdown macro: ::: slideshow [...]
  // Source: https://vuejs.org/v2/guide/render-function.html
  getChildrenTextContent(children: any[] | undefined): string {
    const that = this;
    if (children === undefined)
      return "";
    return children
      .map(function (node) {
        return node.children ? that.getChildrenTextContent(node.children) : node.text;
      })
      .join("");
  }

  getSlotAsText(): string {
    if (this.$slots !== undefined && this.$slots.default !== undefined) {
      return this.getChildrenTextContent(this.$slots.default);
    } else return "";
  }

  getThumbnail(image: any): string {
    // TODO: handle special chars etc.
    // TODO: use image.reference instead?
    const i = image.url.lastIndexOf("/");
    const name = image.url.substring(i + 1);
    let thumbnail = image.url.substring(0, i) + "/.thumbnails/" + name + ".png";
    // TODO: move default background image dimensions to CSS
    //return `background-image: url('${thumbnail}'); width: 150px; height: 100px;`;
    return thumbnail;
  }

  katonoma(ref: Reference): string {
    return katonoma(ref);
  }

  urize(ref: Reference): string {
    return urize(ref);
  }

  htmlize(markdown: string): string {
    return zevir.htmlizeSync(markdown);
  }

  isSphere(name: string): boolean {
    return katonoma(this.$store.state.sphere).indexOf(name) === 0;
  }

  /** Checks if a file has an image extension. */
  isImage(ref: Reference): boolean {
    const id = katonoma(ref).toLowerCase();
    return imageExtensions.some((extension) => {
      let i = id.indexOf(extension);
      if (i === id.length - extension.length) return true;
    });
  }

  parse(text: string): any {
    return yaml.safeLoad(text);
  }

  parseNodeBody(): any {
    if (this.$slots?.default !== undefined) {
      const slot = this.getChildrenTextContent(this.$slots.default);
      try {
        // In case the slot contains a row matching exactly with "-", the block above that separator is considered as a configuration
        const array = slot.split(/^-$/gm);
        if (array.length === 2) {
          return { config: yaml.safeLoad(array[0]), body: yaml.safeLoad(array[1]) };
        } else return yaml.safeLoad(slot);
      } catch (e) {
        // TODO: add logger
        console.log("parseNodeBody YAML error");
        return { error: e.toString() };
      }
    } else
      return {};
  }

  removeTitle(text: string): string {
    if (text.startsWith("#"))
      return text.replace(/^# .+$/m, "").trim();
    return text;
  }

  resolve(name: string, set?: Reference, t = Type.PAGE, language?: string): Reference {
    if (set === undefined)
      set = this.$store.state.sphere;
    return resolve(name, set, t, language);
  }

  // Extracts the title and the content of a text as an object
  // TODO: use this in ub traverser
  toArticle(text: string): any {
    const regex = /^# (.*)$/m;
    const match = regex.exec(text);
    let title = undefined, body = undefined;
    if (match != null) {
      title = match[1];
      const i = text.indexOf("\n");
      if (i > 0 && text.length > i)
        body = text.substring(i + 1).trim();
    } else {
      body = text;
    }
    return { title: title, body: body };
  }

  // transform xxx@page to MEDIA reference with id=xxx and set=page reference
  resolveMedia(ref: string): Reference {
    const regex = /([^@]*)@(.*)/;
    const array = regex.exec(ref);
    let reference = undefined;
    if (array != null && array.length >= 3) {
      return resolve(array[1], resolve(array[2], this.$store.state.sphere), Type.MEDIA);
    }
    // TODO: handle error or return empty reference?
    return resolve(ref, this.$store.state.sphere, Type.MEDIA);
  }

  /// Convert xxxx.jpg@yyy to an object containing a reference to the image and its url
  toMedia(reference: Reference | string): any {
    if (typeof reference === "string") {
      const ref = this.resolveMedia(reference);
      if (ref !== undefined) {
        // TODO: is the id property really needed?
        return {
          id: reference,
          url: serialize(ref),
          reference: ref,
        };
      }
      return undefined;
    } else if (reference !== undefined) {
      return {
        reference: reference,
        url: serialize(reference),
      };
    }
  }

  serialize(ref: Reference): string {
    return serialize(ref);
  }

  yamlize(obj: any): string {
    return yaml.safeDump(obj);
  }

}