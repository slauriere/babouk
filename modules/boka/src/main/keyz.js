"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mousetrap_1 = __importDefault(require("mousetrap"));
const bus_js_1 = __importDefault(require("./bus.js"));
const setup = (element, store) => {
    mousetrap_1.default(element).bind("ctrl+e", () => {
        bus_js_1.default.$emit("page-close-active");
        return false;
    });
    mousetrap_1.default(element).bind("ctrl+o", () => {
        store.commit("dialog", { id: "open" });
        return false;
    });
    mousetrap_1.default(element).bind("ctrl+1", () => {
        store.commit("dialog", { id: "ring" });
        return false;
    });
    mousetrap_1.default(element).bind("ctrl+2", () => {
        bus_js_1.default.$emit("page-open-random");
        return false;
    });
    mousetrap_1.default(element).bind("ctrl+3", () => {
        bus_js_1.default.$emit("page-delete");
        return false;
    });
    return false;
};
const unsetup = (element) => {
    mousetrap_1.default(element).unbind("ctrl+1");
    mousetrap_1.default(element).unbind("ctrl+2");
    mousetrap_1.default(element).unbind("ctrl+3");
    mousetrap_1.default(element).unbind("ctrl+e");
    mousetrap_1.default(element).unbind("ctrl+o");
};
exports.default = {
    setup,
    unsetup
};
//# sourceMappingURL=keyz.js.map