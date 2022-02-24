"use strict";

// Available as a separate module so that it can be used either by a graphical interface or from the command line

import { http } from "./http.js";

import { Relation, Type, Page, resolve, katonoma, Reference, serialize, Ring } from "@babouk/model";

// TODO: this should be moved to a parameter given to the functions because the lib should
// work also as an http client in command line.
// TODO: also this raises an issue in case an application needs to send a request to a distinct sphere.
//const sphere = resolve(window.location.hostname, undefined, Type.SPHERE);

const addMediaFromForm = async (eie: Reference, files: string[]): Promise<any> => {
  const url = serialize(resolve(Type.MEDIA, eie, Type.SERVICE));
  let formData = new FormData();
  Array.from(files).forEach((fileName: string) => {
    formData.append("media", fileName);
  });
  // https://tools.ietf.org/html/rfc2616
  return http
    .post(
      url,
      formData,
      { headers: { "content-type": "multipart/form-data" } }
    )
    .then((response: any) => {
      return response;
    });
};

// TODO: rename to "saveMedia"? Distinguish between adding and saving?
const addMedia = async (page: Reference, name: string, content: string): Promise<any> => {
  const url = serialize(resolve(Type.MEDIA, page, Type.SERVICE));
  let formData = new FormData();
  var blob = new Blob([content], { type: "text/plain" });
  formData.append("media", blob, name);
  return http
    .post(
      url,
      formData,
      { headers: { "content-type": "multipart/form-data" } }
    )
    .then((response: any) => {
      return response;
    });
};

/**
 * This function is kept here just in case Boka could be used with path-based orba definition in the future rather than domain based.
 */
const getSphere = () => {
  const pathname = window.location.pathname;
  if (pathname.length > 1) {
    const segments = window.location.pathname.split("/");
    if (segments.length >= 2) {
      return segments[1];
    } else {
      throw new Error("Orbis identifier missing !");
    }
  } else {
    const idx = location.hostname.indexOf(".");
    if (idx > 0) {
      return location.hostname.substring(0, idx);
    }
    throw new Error("Orbis identifier missing !");
  }
};

const getRelations = async (referent: Reference, text: string): Promise<Relation[]> => {
  let url = serialize(resolve("relations", referent, Type.SERVICE));
  const response = await http.get(url, { params: { text: text } });
  return response.data;
};

const searchRelatum = async (relation: Reference, text: string): Promise<any> => {
  let url = serialize(resolve("image", relation, Type.SERVICE));
  // TODO: add headers
  const response = await http.get(url, { params: { text: text } });
  return response.data;
};

const getRandomPage = async (sphere: Reference) => {
  let url = serialize(resolve(".random", sphere, Type.SERVICE));
  const response = await http.get(url);
  return response.data;
};

const getMediaMetadata = async (media: Reference): Promise<any> => {
  const referent = media.set;
  return getMedia(resolve(katonoma(media) + ".md", referent, Type.MEDIA));
}

const addMediaMetadata = async (media: Reference, metadata: string): Promise<any> => {
  const fileName = katonoma(media) + ".md";
  if (media.set !== undefined)
    return addMedia(media.set, fileName, metadata);
  return Promise.resolve();
  //const html = await zevir.htmlize(markdown);
  //return Promise.resolve(markdown);

}

const bok = async (eie: Reference): Promise<any> => {
  const url = serialize(resolve(".bok", eie, Type.SERVICE));
  const response = await http.get(url);
  return response.data;
};

const addPage = async (referent: Reference): Promise<any> => {
  const url = serialize(referent);
  const response = await http.post(url, {});
  return response.data;
};

const saveRing = async (r: Ring): Promise<Ring> => {
  // Check that the ring is correctly formed
  if (r.referent == null || r.relation == null || (r.relatum == null && r.value == null))
    return Promise.reject("Incorrect ring: " + r);
  // We create a clone of the ring without any body as body would load the network uselessly
  // TODO: the clone won't work if the page type gets more complex. 
  // Solution: use proper deep close, or introduce a shallow ring which does not contain eiee, but simply sylkas (references)
  let clone = JSON.parse(JSON.stringify(r));
  delete clone.referent.body;
  delete clone.relation.body;
  if (clone.relatum != null)
    delete clone.relatum.body;
  const url = serialize(resolve(Type.RING, clone.referent.reference, Type.SERVICE));
  const response = await http.put(url, clone);
  return response.data;
};

const getPage = async (referent: Reference) => {
  // A request is performed except for service pages whose content display is managed directly at the component level
  // TODO: service declaration: see also ub/sam -> merge the two
  const services = [".search", ".history"];
  if (services.includes(katonoma(referent))) {
    return new Page(referent, katonoma(referent));
  } else {
    let url = serialize(referent);
    // TODO: move to gola:createQueryString or toQueryString or toUrl
    const response = await http.get(url);
    return response.data;
  }
};

// TODO: we may consider to prefix the keywords with a dot to distinguish them from real resources (eg: .signin, .signup, etc.) and to mark them
// as belonging to a specific namespace
// signin. The login and password may be empty is the login attempt is performed using the cookie information only.
const signin = async (sphere: Reference, login?: string, password?: string): Promise<any> => {
  const url = serialize(resolve(".signin", sphere, Type.SERVICE));
  const response = await http.post(url, { login: login, password: password })
  return response.data;
};

const getInstances = async (sphere: Reference, typeId: string): Promise<any> => {
  const url = serialize(resolve(".instances", sphere, Type.SERVICE));
  const response = await http.get(url, { params: typeId != undefined ? { type: typeId } : undefined });
  return response.data;
};


// } else if (ring !== undefined) {
//   const response = await http.get("/.search", { params: ring });
//   return response.data;

const search = async (text?: string, sort?: any): Promise<any> => {
  if (text !== undefined) {
    // TODO: there should not be assumption about the method: 'get' or 'post' should be configurable as well
    const response = await http.get("/.search", { params: { text: text, sort: sort } });
    return response.data;
  } else {
    return Promise.resolve();
  }
};

const searchImages = async (text: string): Promise<Reference[]> => {
  // TODO: there should not be assumption about the method: 'get' or 'post' should be configurable as well
  const response = await http.get("/.images", { params: { text: text } });
  return response.data;
};

const signup = async (sphere: Reference, login: string, password: string): Promise<any> => {
  const url = serialize(resolve(".signup", sphere, Type.SERVICE));
  const response = await http.post(url, { login: login, password: password });
  return response.data;
};

const saveBody = async (ref: Reference, data: any): Promise<any> => {
  const url = serialize(ref);
  const response = await http.put(url, data);
  return response.data;
};

const scratch = async (ref: Reference): Promise<any> => {
  const url = serialize(ref);
  const response = await http.delete(url);
  return response.data;
};

const getMediaList = async (ref: Reference): Promise<Reference[]> => {
  let url = serialize(resolve(Type.MEDIA, ref, Type.SERVICE));
  const response = await http.get(url);
  const fileNames: Array<string> = response.data;
  return fileNames.map(item => resolve(item, ref, Type.MEDIA));
};

// This may get merged with getPage into a single "get" or "getContent" function since the code is almost identical.
const getMedia = async (ref: Reference): Promise<any> => {
  let url = serialize(ref);
  const response = await http.get(url);
  return response.data;
};

const history = async (ref: Reference): Promise<any> => {
  let url = undefined;
  // In case the sylka is an orba, ask for the orba history, otherwise, ask for the page history
  if (ref.type === Type.SPHERE) {
    url = serialize(resolve(".history", ref, Type.SERVICE));
  } else {
    url = serialize(resolve("history", ref, Type.SERVICE));
  }

  // TODO: there should not be assumption about the method: 'get' or 'post' should be configurable as well
  const response = await http.get(url)
  return response.data;
};

const wikji = async (sphere: Reference, labels: any): Promise<any> => {
  let url = serialize(resolve(".wikji", sphere, Type.SERVICE));
  return http.get(url, { params: { labels: labels } });
};

/**
 * Returns the rings of a page, limited to the ones involving the given relation(s) if any.
 * TODO: complete implementation
 * TODO: possibly use only string as parameters instead of references since it's more convenient as an API and this is pure API.
 * @param ref
 * @param akea 
 */
const getRings = async (referent: Page | string | Reference, relations?: string | Reference | string[] | Reference[], relatum?: string, types?: string[], squashMode: number = 0, sortBy?: string, language?: string): Promise<Ring[]> => {
  let ref = undefined;
  console.log("referent", referent);
  if (typeof referent === "string")
    ref = resolve(referent);
  else if ((referent as any).reference !== undefined)
    ref = (referent as any).reference;
  else
    ref = referent as Reference;
  let url = serialize(resolve(Type.RING, ref, Type.SERVICE));
  if (url != null) {
    let rels = undefined;
    if (relations !== undefined) {
      if (Array.isArray(relations)) {
        rels = [];
        relations.forEach((r: any) => {
          //rels.push(katonoma(a));
          if (typeof r === "string")
            url += "/" + r;
          else
            url += "/" + katonoma(r);
        });
      } else {
        if (typeof relations === "string")
          url += "/" + relations;
        else
          url += "/" + katonoma(relations);
        //rels = katonoma(relations);
      }
    }
    const response = await http.get(url, { params: { relatum: relatum, types: types, squash: squashMode, sort: sortBy, language: language } });
    return response.data;
  } else {
    return new Array<Ring>();
  }
};

export default {
  getRelations, searchRelatum, addMedia, addMediaFromForm, addMediaMetadata,
  getRandomPage, bok,
  addPage, saveRing,
  getPage, getMedia, getMediaMetadata, signin, search, signup,
  getInstances, saveBody, scratch, getMediaList,
  history, wikji, getRings, searchImages
};
