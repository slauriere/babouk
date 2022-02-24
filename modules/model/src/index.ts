"use strict";

enum Ker {
  RELATION = ".relation",
  HAS_DOMAIN = ".has-domain",
  HAS_IMAGE = ".has-image",
  LINKED = ".is-linked-to",
  IS_A = ".is-a",
  TYPE = ".type"
}

enum Type {
  COMMIT = "commit",
  PAGE = "page",
  SPHERE = "sphere",
  SERVICE = "service",
  MEDIA = "media",
  RING = "rings",
}


class Reference {
  inverse?: boolean; // actually only for relations
  constructor(public name: string, public set?: Reference, public type: Type = Type.PAGE, public language: string = "default", inverse: boolean = false) {
    if (inverse === true)
      this.inverse = inverse;
  }
}

class Page {
  // body can be plain text or object (e.g. when the server creates an page representing a commit, it returns a structured diff as a body)
  // TODO: the saved, mode and submode properties may be moved to a subclass that is available only on the client side 
  // since they're used to deal with views, unless we want to serialize the entire application state on the server side
  // TODO: consider moving the mode and submode to the reference
  // metadata: mtime, ctime, otime (original time), language, creator, last author, ...
  // NB: a page in two different languages shoud probably have two distinct references
  constructor(public reference: Reference, public title?: string, public body?: any, public editable?: boolean, public createdAt?: number, public updatedAt?: number, public creator?: string, public lastCommitter?: string) {
    // The reference can be undefined in case it was created with resolve(undefined)
    this.title = title !== undefined ? title : reference !== undefined ? katonoma(reference) : undefined;
  }
}

/**
 * A relation.
 */
class Relation extends Page {
  // By default, the domain and the image are universal: their value is "*"
  constructor(public reference: Reference, public title?: string, public body?: string, public domain: string = "*", public image: string = "*") {
    super(reference, title, body);
  }
}

/**
 * Represents a view displaying a page and its state or mode. The view is the name of a Vue component (e.g. default view, history, map, grid, possibly pluggable components in the future).
 * - template is the name of the Vue component used to display the page (e.g. "history" for "history.vue", etc.)
 * - mode relates to the component mode, it can be for instance "view" or "edit" depending whether the page is viewed or edited.
 */
class View {
  constructor(public page: Page, public template: string, public mode?: string, public active?: boolean, public saved?: boolean) {
  }

  equals(view: View): boolean {
    return katonoma(this.reference()) === katonoma(view.reference()) && this.reference().language === view.reference().language && this.template === view.template;
  }

  // Shortcut function to access the wrapped page's reference
  reference(): Reference {
    return this.page.reference;
  }
}

// A dedicated function rather than one attached to class reference because some references can originate from the client
const getSphere = (ref: Reference): Reference => {
  if (ref.type === Type.SPHERE) return ref;
  else if (ref.set !== undefined) return getSphere(ref.set);
  else {
    // TODO: logger
    console.log("warning: issue when computing the sphere reference for " + JSON.stringify(ref));
    // TODO: check why returning undefined is accepted by TypeScript while the expected return type is "reference".
    return undefined;
  }
}

class Ring {
  constructor(public reference: Reference, public referent: Page, public relation: Page, public relatum?: Page, public value?: string, public properties?: any) {
  }
}

const shortify = (ref: Reference): string => {
  if (ref.type === Type.MEDIA) {
    return katonoma(ref) + "@" + katonoma(ref.set);
  } else {
    return katonoma(ref);
  }
}

/**
 * Returns a short representation of a page or a ring, mostly for logging purpose.
 */
const abbrev = (o: any): string => {
  if (o.referent !== undefined) {
    // ring
    return `${katonoma(o)}-${katonoma(o.referent)}-${katonoma(o.relation)}-${katonoma(o.relatum)}-${katonoma(o.value)}`;
  } else {
    // page or reference
    return `${katonoma(o)}`;
  }
}

// TODO/ move this function to class reference?
// reference is made optional in order to allow the code calling this function to be flexible (no need to check that the reference is not undefined there)
// on the client side we manipulate plain json object, we don't know the real type
const katonoma = (object?: any): string => {
  if (object == null || object === undefined) return undefined;
  if (object.page !== undefined) {
    // The object is a view.
    // For some reason the test on "constructor.name === 'view'" does not work
    // with webpack production mode (but works in development mode).
    return katonoma(object.page);
  } else if (object.reference !== undefined) {
    return object.reference.name;
  } else {
    return object.name;
  }
}

// Creates a new Reference from an existing one, with a given language
const localize = (referent: Reference, language: string): Reference => {
  return resolve(referent.name, referent.set, referent.type, language);
}

// Same as katonoma except it adds the language
const urize = (object?: any): string => {
  if (object == null || object === undefined) return undefined;
  if (object.page !== undefined) {
    // The object is an view.
    // For some reason the test on "constructor.name === 'view'" does not work
    // with webpack production mode (but works in development mode).
    return urize(object.page);
  } else if (object.reference !== undefined) {
    if (object.reference.language === "default")
      return object.reference.name;
    else
      return object.reference.name + ":" + object.reference.language;
  } else {
    // object is a Reference
    if (object.language === "default")
      return object.name;
    else
      return object.name + ":" + object.language;
  }
}

// TODO: merge resolve and resolvi into one common method that converts the first argument into an array
// in case it is not one already.
// TODO: the type should be before the set because an page always has a type, only the set is optional (for spheres), and the type argument should not be optional maybe
// TODO: for now we use "any" for id as the function is called from jol whith req.query returning string | ParsedQs (-> see what is ParsedQs)
// Resolves an array of ids
const resolve = (name: string, set?: Reference, t: Type = Type.PAGE, language?: string, inverse: boolean = false): Reference => {
  if (name === undefined)
    return undefined;
  // TODO: this happens with pages whose id is a number, fix that.
  if (typeof name !== "string")
    name = "" + name;
  if (name.indexOf("~") === 0 && name.length > 1) {
    inverse = true;
    name = name.substring(1);
  }
  return new Reference(name, set, t, language, inverse);
}

const resolveSet = (names: string[], set?: Reference, type?: Type, language?: string): Reference[] => {
  if (names === undefined)
    return undefined;
  let refs = new Array<Reference>();
  names.forEach(name => {
    refs.push(resolve(name, set, type, language) as Reference);
  })
  return refs;
}

const normalize = (name: string) => {
  name = name.toLowerCase();
  name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  name = name.replace(/[\s\.'";:!%,]/g, "-");
  name = name.replace(/-{2,4}/g, "-");
  // TODO: also remove dashes at the end, if any
  return name;
}

// TODO: introduce function getOrbir which returns e.set for an page, and e.set.set for a media or a ring

// TODO: we may want to use serialize in the body of this function
// TODO: move this function to class reference?
// TODO: move this to sam since it does not relate to the model but to the application
const serialize = (ref: Reference): string => {
  // TODO: what's the best way to check what's the object's type
  //console.log("serialize", s);
  if (ref === undefined)
    throw new Error("[babouk model] no URI could be created from undefined reference");
  let url: string;
  if (ref.type === Type.SPHERE) {
    url = ".";
  } else if (ref.type === Type.PAGE) {
    url = `${serialize(ref.set)}/${urize(ref)}`;
  } else if (ref.type === Type.RING || ref.type === Type.MEDIA) {
    url = `${serialize(ref.set)}/${ref.type}/${katonoma(ref)}`;
  } else if (ref.type === Type.COMMIT) {
    url = `${serialize(ref.set)}/${katonoma(ref)}`;
  } else if (ref.type === Type.SERVICE) {
    // A service can be applied either to an page or to an orba so far, hence its 'set' is either an page or an orba.
    if (ref.set.type === Type.PAGE)
      url = `${serialize(ref.set)}/${katonoma(ref)}`;
    else
      url = `${katonoma(ref)}`;
  }
  //console.log('serialize', r, url);
  if (url === undefined) {
    console.log("[babouk model] serialize error:", ref);
    throw new Error("[babouk model] no URI could be created from " + ref);
  } else {
    if (url.startsWith("./"))
      return url.substring(1);
    return url;
  }
};

// TODO add method "toUri" taken from sam

export { abbrev, View, Ker, getSphere, katonoma, localize, normalize, Page, Reference, Relation, resolve, resolveSet, shortify, Ring, Type, urize, serialize };