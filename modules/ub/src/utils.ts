import { exec } from 'child_process';
import fs, { Dirent } from "fs-extra";
import path from "path";

import yaml from "js-yaml";
import diacritics from "normalize-diacritics";


import { getSphere, Page, katonoma, resolve, Reference, Type, serialize } from "@babouk/model";
import server from "./server.js";
import store from './services/store.js';
import pixier from './services/pixier.js';

const sys = {
  iiakhawunti: ".iiakhawunti",
  git: ".git",
  trash: ".trash"
};

const BODY = "body";
const METADATA = ".metadata";
const UTF8 = "utf-8";
const KEY = ".key"; // name of the file storing the encrypted login/password of a user, attached to a user page

const getBokaDir = (): string => {
  const serv = server.get();
  return serv.boka;
}

// Gets the boka settings for a given sphere
// TODO: store in a cache and update when necessary
const getSettings = async (sphere: Reference): Promise<any> => {
  // TODO: store settings in cache, but there's a need to refresh it when it's updated
  //const dlala = isicelo.get();
  // if (orb.settings != undefined) {
  //   return orb.settings;
  // } else {
  const page = await store.getPage(resolve(".settings", sphere));
  return parse(page.body);
}

// Gets the boka entry point
// TODO: the settings should be saved in a cache
const getBoka = async (ref: Reference): Promise<string> => {

  // if (o != undefined) {
  //   return o.boka;
  // } else {
  //   throw new Error("Boka path is not configured");
  // }
  let p = undefined;
  if (ref.type === Type.SPHERE) {
    const settings = await getSettings(ref);
    if (settings.home === undefined) throw Error("no home found in settings");
    ref = resolve(settings.home, ref);
  } else if (ref.type === Type.SERVICE) {
    p = new Page(ref, "History");
  }
  if (p === undefined) p = await store.getPage(ref);
  // TODO: externalize this to file
  const pageMeta = await getPageMeta(p);
  return `<!DOCTYPE html>
  <html lang="en" xml:lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head prefix="og:http://ogp.me/ns#">
      <title>${p.title}</title>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      ${pageMeta}
      <link rel="stylesheet" href="/dist/bulma.css"/>
      <link rel="stylesheet" href="/dist/boka.css"/>
    </head>
    <body>
      <div id="boka"></div>
      <script src="/dist/boka.js" type="text/javascript"></script>
    </body>
  </html>`;
}

const getPageMeta = async (p: Page): Promise<string> => {
  const serv = server.get();
  // // TODO: use a Map<sylka, any> instead of Map<string, any>
  const sphere = serv.spheres[katonoma(getSphere(p.reference))];
  let max = 227;
  let meta = "";
  if (p.body !== undefined) {
    //[![](/christov/media/rakata-1.jpg)](retrospective)
    const content = removeTitle(p.body).replace(/::: figure.+?(?=:::):::/gsm, "").replace(/^:::.*$/gm, "");
    let description = content.substring(0, Math.min(max, content.length));
    // TODO: check if there is a function already for truncating a string without truncating words
    if (content.length > 227) {
      description += '...';
    }
    // TODO: escape double quotes rather than replacing by single quotes
    description = description.replace(/\r?\n+/gs, " ").replace(/"/g, "'").trim();
    meta += `<meta name="description" content="${description}"/>
      <meta name="og:description" content="${description}"/>`;
  }
  if (p.title !== undefined) {
    // TODO: escape double quotes rather than replacing by single quotes
    const label = p.title.replace(/"/g, "'");
    meta += `\n      <meta property="og:title" content="${p.title}" />`;
  }
  meta += `\n      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://${sphere.id}/${serialize(p.reference)}"/>`;
  const mediaList = await store.getMedia(p.reference);
  if (mediaList !== undefined && mediaList.length > 0) {
    const images = mediaList.filter(item => pixier.isImage(item));
    if (images.length > 0) {
      const image = resolve(images[0], p.reference, Type.MEDIA);
      meta += `\n      <meta property="og:image" content="https://${sphere.id}${serialize(image)}"/>`;
    }
  }
  return meta;
}

const removeTitle = (text: string): string => {
  // Remove title only if it's at the beginning of the document
  if (text.startsWith("#"))
    return text.replace(/^# .+$/m, "");
  return text;
}

/**
 * Generates a random hexa code color.
 */
const getRandomHex = (length: number = 6, hash: boolean = false): string => {
  const letters = '0123456789abcdef';
  let color = '';
  if (hash) color += '#';
  for (let i = 0; i < length; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const getFolderNames = (path: string) => {
  const data: any = fs.readdirSync(path, { withFileTypes: true });
  const systemFolderNames = Object.values(sys);
  return data.filter((entry: any) => entry.isDirectory() && !systemFolderNames.includes(entry.name)).map((entry: any) => entry.name);
}

/**
 * Returns the path of the parent folder containing this file. This function is to avoid importing the 'path' library in modules importing this one.
 * @param file path of a file
 */
const dirname = (file: string): string => {
  return path.dirname(file);
}

// https://medium.com/@ali.dev/how-to-use-promise-with-exec-in-node-js-a39c4d7bbf77
const execute = (command: any) => {
  return new Promise((resolve, reject) => {
    exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.warn(error);
      }
      resolve(stdout ? { result: stdout } : { err: stderr });
    });
  });
}

const getBodyName = (reference: Reference): string => {
  if (reference.language === undefined || reference.language === "default")
    return BODY + ".md";
  else
    return BODY + "." + reference.language + ".md";
}

// TODO: there should be no need of a sysFolder: we should be able to deduce the parent folder directly from the reference. 
// For example when storing a user page, the parent should be the folder ".iiakhaunti" directly.
const pathify = (reference: Reference, fileName?: string): string => {
  // TODO: pathify is called really often, in particular due to settings, see if this can be reduced. possibly cache settings
  // TODO: handle sysfolder
  // NB: we don't use 'getSphere' function here because rings can originate from the client as JSON objects, hence not real
  // ring instances.
  let root = getRoot(getSphere(reference));
  const t = reference.type;
  if (t === Type.SPHERE) return root;
  else {
    if (reference.set === undefined)
      throw Error("undefined set for reference:" + reference);
    let parent = pathify(reference.set);
    if (t === Type.PAGE) {
      const p = path.join(parent, katonoma(reference));
      if (fileName === BODY) return path.join(p, getBodyName(reference));
      else if (fileName !== undefined) return path.join(p, fileName);
      else return p;
    }
    if (t === Type.MEDIA) {
      return path.join(parent, t, katonoma(reference));
    }
    if (t === Type.RING) {
      return path.join(parent, Type.RING, katonoma(reference) + ".yaml");
    }
    if (t === Type.SERVICE) {
      return path.join(parent, katonoma(reference));
    }
  }
  throw new Error("pathify error: " + reference);
}
/**
 * In some cases, dots are kept, e.g. when uploading a file whose name contains dots (outside the extension). In other cases, a dot at the beginning of a name can refer to a system page, and within a string, we tend to avoid URLs containing dots, favouring dashes.
 * @param name
 * @param replaceDots 
 */
const normalize = (name: string, replaceDots: boolean = true) => {
  let id = name.toLowerCase();
  // id = id.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  id = diacritics.normalizeSync(id);
  let pattern = "[\\s'\"’`_–«»;: !%, /#*";
  if (replaceDots === true) pattern += "\\.]";
  else pattern += "]";
  const regex = new RegExp(pattern, "g");
  console.log("pattern", pattern);
  id = id.replace(regex, "-");
  id = id.replace(/-{2,4}/g, "-");
  // TODO: also remove dashes at the end, if any
  return id;
}

const renameMedia = (dir: string, targetDir: string, prefix?: string) => {
  const files = getFiles(dir);
  fs.ensureDirSync(targetDir);
  if (prefix === undefined)
    prefix = getRandomHex(2);
  const ids = getAlphabeticalIdentifiers();
  files.forEach((file, index) => {
    const newName = prefix + "-" + ids[index] + path.extname(file.name);
    const targetFile = path.join(targetDir, newName);
    fs.copySync(path.join(dir, file.name), targetFile, { preserveTimestamps: true });
  })
}

const getAlphabeticalIdentifiers = (): any[] => {
  const characters: string[] = [];
  for (let i = 97; i < 123; i++) {
    const char = String.fromCharCode(i);
    characters.push(char);
  }
  let identifiers: string[] = [];
  characters.forEach(char1 => {
    characters.forEach(char2 => {
      characters.forEach(char3 => {
        identifiers.push(`${char1}${char2}${char3}`);
      });
    });
  });
  return identifiers;
}

const getFiles = (dir: string) => {
  let files: Dirent[] = fs.readdirSync(dir, { withFileTypes: true });
  files = files.filter((entry) => entry.isFile())

  return files.sort((a, b) => {
    return fs.statSync(path.join(dir, a.name)).mtime.getTime() -
      fs.statSync(path.join(dir, b.name)).mtime.getTime();
  });

}

const getThumbnailPath = (file: Reference): string => {
  const thumbnails = resolve(".thumbnails", resolve(Type.MEDIA, file.set, Type.SERVICE), Type.SERVICE);
  let p = pathify(thumbnails);
  p = path.join(p, katonoma(file) + ".png");
  return p;
}

const getMetadataPath = (file: Reference): string => {
  const ref = resolve(katonoma(file) + ".md", file.set, Type.MEDIA);
  return pathify(ref);
}

const parse = (text: string): any => {
  return yaml.safeLoad(text, yaml.JSON_SCHEMA); // TODO: check most appropriate yaml schema
}

const yamlize = (obj: any): string => {
  return yaml.safeDump(obj);
}

const getRoot = (sphere: Reference): string => {
  const id = katonoma(sphere);
  const serv = server.get();
  if (serv === false) {
    // This is in case sam is launched in command line rather than an HTTP application.
    // TODO: there could be a cache avoid to reparse the yaml configuration for every call.
    // TODO: the config file path should be given as an argument
    const configPath = "./ub.yaml";
    const config = parse(fs.readFileSync(configPath).toString());
    let spheres = config.spheres.reduce((obj: any, sphere: any) => {
      obj[sphere.id] = sphere;
      return obj;
    }, {});
    if (spheres[id] !== undefined) {
      return spheres[id].path;
    } else {
      throw new Error("invalid sphere root: " + katonoma(sphere));
    }
  } else {
    const sphere = serv.spheres[id];
    if (sphere != undefined) {
      return sphere.path;
    } else {
      throw new Error("invalid sphere: " + katonoma(sphere));
    }
  }
}

// TODO: add generics
const toArray = (arg: any) => {
  if (Array.isArray(arg))
    return arg;
  else if (arg !== undefined)
    return [arg];
  else
    return [];
}

const kebabToCamel = (input: string) => {
  return input.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
}

enum Order {
  ASC = 1,
  DESC = -1
}

// See also org.apache.lucene.search/Sort.java
class Sort {
  constructor(public field: string, public order: Order = Order.ASC) { }

  static parse(str: string | undefined): Sort | undefined {
    if (str === undefined)
      return undefined;
    const array = str.split(":");
    let sort = new Sort(kebabToCamel(array[0]), Order.ASC);
    if (array.length === 2 && array[1].toLowerCase() === "desc") {
      sort.order = Order.DESC;
    }
    return sort;
  }


  _safeGetNumber(obj: any): number {
    if (obj === undefined || obj[this.field] === undefined)
      return 0;
    return obj[this.field];
  }

  _safeGetString(obj: any,): string {
    if (obj === undefined || obj[this.field] === undefined)
      return "-";
    return obj[this.field].toString();
  }

  compareNumbers(a: any, b: any): number {
    return (this._safeGetNumber(a) - this._safeGetNumber(b)) * this.order;
  }

  compareStrings(a: any, b: any, locale: string = "en"): number {
    return (this._safeGetString(a).localeCompare(this._safeGetString(b), locale)) * this.order;
  }
}

export {
  execute, getBoka, getBokaDir, getRandomHex, dirname,
  getFiles, getFolderNames, getRoot, getMetadataPath, getSettings,
  getThumbnailPath, normalize, pathify, renameMedia, sys, toArray, KEY, BODY, METADATA, UTF8, Sort, Order,
  parse, yamlize
}