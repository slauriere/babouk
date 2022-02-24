"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const js_yaml_1 = __importDefault(require("js-yaml"));
const vue_property_decorator_1 = require("vue-property-decorator");
const dayjs_1 = __importDefault(require("dayjs"));
const model_1 = require("@babouk/model");
const zevir_1 = __importDefault(require("@babouk/zevir"));
const bus_1 = __importDefault(require("../main/bus"));
const imageExtensions = [".gif", ".jpg", ".jpeg", ".png", ".svg", ".tiff"];
let Utils = class Utils extends vue_property_decorator_1.Vue {
    /** Adds a header to the head tag. */
    addHeader(element) {
        document.getElementsByTagName("head")[0].appendChild(element);
    }
    removeHeader(element) {
        console.log("removing header", element);
        document.getElementsByTagName("head")[0].removeChild(element);
    }
    registerStyle(url, dynamic = false) {
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
    formatTime(time, format = "YYYY-MM-DD HH:mm") {
        return dayjs_1.default(time).format(format);
    }
    /** Remove custom styles which were included dynamically for specific pages. */
    deactivateDynamicStyles() {
        const matches = document.querySelectorAll("link[data-page]");
        console.log("matches", matches);
        for (const match of matches) {
            this.removeHeader(match);
            //match.setAttribute("disabled", "disabled");
        }
    }
    debounce(func, wait, immediate) {
        let timeout = undefined;
        return function () {
            let context = this, args = arguments, later = function () {
                timeout = null;
                if (!immediate)
                    func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow)
                func.apply(context, args);
        };
    }
    toClassName(input) {
        // A class name must begin with an underscore (_), a hyphen (-), or a letter(a–z).
        return input.replace(/^[\.\d]+/m, "-");
    }
    arrayize(arg) {
        if (Array.isArray(arg))
            return arg;
        else if (arg !== undefined)
            return [arg];
        else
            return [];
    }
    emit(eventName, ...args) {
        console.log("emit", eventName, args);
        // in case we're opening a page via its id, turn the id into a reference first
        if (eventName === "page-open") {
            const reference = model_1.resolve(args[0], this.$store.state.sphere);
            console.log(args);
            bus_1.default.$emit(eventName, reference, true, ...args.slice(1));
        }
        else if (eventName !== undefined) {
            bus_1.default.$emit(eventName, ...args);
        }
    }
    getQueryStringParameterValue(name) {
        const params = this.getQueryStringParameters();
        return params.get(name);
    }
    getQueryStringParameters() {
        // https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
        return new URLSearchParams(location.search);
    }
    getImageExtensions() {
        return imageExtensions;
    }
    // Needed when called from a Markdown macro: ::: slideshow [...]
    // Source: https://vuejs.org/v2/guide/render-function.html
    getChildrenTextContent(children) {
        const that = this;
        if (children === undefined)
            return "";
        return children
            .map(function (node) {
            return node.children ? that.getChildrenTextContent(node.children) : node.text;
        })
            .join("");
    }
    getSlotAsText() {
        if (this.$slots !== undefined && this.$slots.default !== undefined) {
            return this.getChildrenTextContent(this.$slots.default);
        }
        else
            return "";
    }
    getThumbnail(image) {
        // TODO: handle special chars etc.
        // TODO: use image.reference instead?
        const i = image.url.lastIndexOf("/");
        const name = image.url.substring(i + 1);
        let thumbnail = image.url.substring(0, i) + "/.thumbnails/" + name + ".png";
        // TODO: move default background image dimensions to CSS
        //return `background-image: url('${thumbnail}'); width: 150px; height: 100px;`;
        return thumbnail;
    }
    katonoma(ref) {
        return model_1.katonoma(ref);
    }
    urize(ref) {
        return model_1.urize(ref);
    }
    htmlize(markdown) {
        return zevir_1.default.htmlizeSync(markdown);
    }
    isSphere(name) {
        return model_1.katonoma(this.$store.state.sphere).indexOf(name) === 0;
    }
    /** Checks if a file has an image extension. */
    isImage(ref) {
        const id = model_1.katonoma(ref).toLowerCase();
        return imageExtensions.some((extension) => {
            let i = id.indexOf(extension);
            if (i === id.length - extension.length)
                return true;
        });
    }
    parse(text) {
        return js_yaml_1.default.safeLoad(text);
    }
    parseNodeBody() {
        var _a;
        if (((_a = this.$slots) === null || _a === void 0 ? void 0 : _a.default) !== undefined) {
            const slot = this.getChildrenTextContent(this.$slots.default);
            try {
                // In case the slot contains a row matching exactly with "-", the block above that separator is considered as a configuration
                const array = slot.split(/^-$/gm);
                if (array.length === 2) {
                    return { config: js_yaml_1.default.safeLoad(array[0]), body: js_yaml_1.default.safeLoad(array[1]) };
                }
                else
                    return js_yaml_1.default.safeLoad(slot);
            }
            catch (e) {
                // TODO: add logger
                console.log("parseNodeBody YAML error");
                return { error: e.toString() };
            }
        }
        else
            return {};
    }
    removeTitle(text) {
        if (text.startsWith("#"))
            return text.replace(/^# .+$/m, "").trim();
        return text;
    }
    resolve(name, set, t = model_1.Type.PAGE, language) {
        if (set === undefined)
            set = this.$store.state.sphere;
        return model_1.resolve(name, set, t, language);
    }
    // Extracts the title and the content of a text as an object
    // TODO: use this in ub traverser
    toArticle(text) {
        const regex = /^# (.*)$/m;
        const match = regex.exec(text);
        let title = undefined, body = undefined;
        if (match != null) {
            title = match[1];
            const i = text.indexOf("\n");
            if (i > 0 && text.length > i)
                body = text.substring(i + 1).trim();
        }
        else {
            body = text;
        }
        return { title: title, body: body };
    }
    // transform xxx@page to MEDIA reference with id=xxx and set=page reference
    resolveMedia(ref) {
        const regex = /([^@]*)@(.*)/;
        const array = regex.exec(ref);
        let reference = undefined;
        if (array != null && array.length >= 3) {
            return model_1.resolve(array[1], model_1.resolve(array[2], this.$store.state.sphere), model_1.Type.MEDIA);
        }
        // TODO: handle error or return empty reference?
        return model_1.resolve(ref, this.$store.state.sphere, model_1.Type.MEDIA);
    }
    /// Convert xxxx.jpg@yyy to an object containing a reference to the image and its url
    toMedia(reference) {
        if (typeof reference === "string") {
            const ref = this.resolveMedia(reference);
            if (ref !== undefined) {
                // TODO: is the id property really needed?
                return {
                    id: reference,
                    url: model_1.serialize(ref),
                    reference: ref,
                };
            }
            return undefined;
        }
        else if (reference !== undefined) {
            return {
                reference: reference,
                url: model_1.serialize(reference),
            };
        }
    }
    serialize(ref) {
        return model_1.serialize(ref);
    }
    yamlize(obj) {
        return js_yaml_1.default.safeDump(obj);
    }
};
Utils = __decorate([
    vue_property_decorator_1.Component
], Utils);
exports.default = Utils;
//# sourceMappingURL=utils.js.map