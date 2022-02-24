

import mousetrap from "mousetrap";
import bus from "./bus.js";

const setup = (element: Element, store: any): boolean => {
  mousetrap(element).bind("ctrl+e", () => {
    bus.$emit("page-close-active");
    return false;
  });
  mousetrap(element).bind("ctrl+o", () => {
    store.commit("dialog", { id: "open" });
    return false;
  });

  mousetrap(element).bind("ctrl+1", () => {
    store.commit("dialog", { id: "ring" });
    return false;
  });

  mousetrap(element).bind("ctrl+2", () => {
    bus.$emit("page-open-random");
    return false;
  });

  mousetrap(element).bind("ctrl+3", () => {
    bus.$emit("page-delete");
    return false;
  });

  return false;
}

const unsetup = (element: Element) => {
  mousetrap(element).unbind("ctrl+1");
  mousetrap(element).unbind("ctrl+2");
  mousetrap(element).unbind("ctrl+3");
  mousetrap(element).unbind("ctrl+e");
  mousetrap(element).unbind("ctrl+o");
}

export default {
  setup,
  unsetup
}
