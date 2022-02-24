"use strict";
import createError from "http-errors";
import fs from "fs-extra";
import path from "path";

import { getSphere, katonoma, Ker, Page, Reference, resolve, Ring, Type } from "@babouk/model";

import cerbero from "./cerberos.js";
import traverser from "./traverser.js";
import { sys, BODY, KEY, METADATA, UTF8, pathify, dirname, normalize, getFiles, getMetadataPath, getThumbnailPath, yamlize, parse } from "../utils.js";
import archiver from "./archiver.js";
import dayjs from "dayjs";

const services = [".random", ".signin", ".signup", ".search", ".images", ".history"];

// TODO: remove usage of 'path' here, just use pathify calls instead
// TODO: create interface that abstracts store from filesystem storage, 
// so that there can be multiple stores: filesystem, HTTP, etc.

const getRandomPage = async (sphere: Reference) => {
  const indices = await traverser.getIndices(sphere);
  //console.log('indices', indices.bodies.identifierFileNameMap);
  const pageReference = getRandomMapValue(indices.bodies.identifierFileNameMap);
  console.log('getRandomPage', pageReference);
  // TODO: we shouldn't go from reference to id to reference but use reference everywhere instead
  return getPage(pageReference);
}

const addPage = async (referent: Reference, author: string, content?: string, identifier?: string): Promise<Page> => {
  const label = referent.name;
  if (identifier === undefined) {
    identifier = normalize(referent.name)
  }
  console.log("addPage", referent, identifier);
  // TODO: group code obtaining id and computing the page path
  //const ref = resolve(identifier, set);
  referent.name = identifier;
  // NB: we don't check if the target folder exists already: an error will be thrown if it does, and will be thrown to the caller
  // NB: the folder may exist already in case the page is a translation
  const folder = pathify(referent);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
  else {
    // Throw an error if there is already a page with the same language
    const targetPath = pathify(referent, BODY);
    if (fs.existsSync(targetPath))
      throw createError(400, `A page with name ${identifier} and language ${referent.language} exists already.`);
  }
  if (content === undefined) content = `# ${label}`;
  await savePage(referent, content, author, true);
  return new Page(referent, label, content);
}

const exists = (ref: Reference): boolean => {
  const p = pathify(ref);
  return fs.existsSync(p);
}

const getPage = async (reference: Reference, user?: Reference): Promise<Page> => {
  const bodyPath = pathify(reference, BODY);
  // TODO: don't call getIndices from here, instead create appropriate functions in indexer.ts
  const body = await fs.readFile(bodyPath, UTF8);
  // indexer.getIndices(e.set).then((indices: any) => {
  const title = await traverser.getTitle(reference);
  // check if user can edit
  let editable = false;
  if (user !== undefined) {
    editable = await cerbero.can(user, reference, "write");
  }
  return new Page(reference, title, body, editable);
}

const getRandomMapValue = (map: Map<string, any>) => {
  return Array.from(map.values())[map.size * Math.random() << 0];
}

const getTypeIds = async (page: Reference) => {
  let rings = await traverser.getRings(page);
  // We filter only the triples where the referent is the pageId itself, and relation is "is a"
  rings = rings.filter(r => katonoma(page) === katonoma(r.referent) && katonoma(r.relation) === Ker.IS_A);
  return rings.map(r => r.relatum != undefined ? katonoma(r.relatum) : undefined);
}

const getUser = async (sphere: Reference, login: string): Promise<Page> => {
  const user = resolve(sys.iiakhawunti, sphere, Type.SERVICE); // reference to the folder containing the users
  return getPage(resolve(login, user));
}

const addUser = async (sphere: Reference, login: string, hash: string): Promise<Page> => {
  // Ensure the system folder for accounts exists
  const iias = resolve(sys.iiakhawunti, sphere, Type.SERVICE);
  fs.ensureDirSync(pathify(iias));
  // for now we store the password hash as content

  // TODO: an event listener mechanism will replace this, typically by creating listeners as pages with some script and a specific type
  // and which get loaded by the server upon server.
  // In case of the "izdubar" orb, a page representing the user is created
  // if (katonoma(eie.getSphere()) === "izdubar") {
  //   // We create an page for the user, because this is where she will store their biblio
  //   await pagen(eie.getSphere(), katonoma(eie), "stromae");
  // }

  // Create page, sets its content with the user login as title
  const userRef = resolve(login, iias);
  const user = await addPage(userRef, "stromae", `# ${login}`);
  const skja = resolve(KEY, user.reference, Type.MEDIA);
  await addMedia(skja, hash);
  return user;
}

// Reads the user credentials hash 
const getUserKey = async (user: Reference): Promise<string> => {
  const skja = resolve(KEY, user, Type.MEDIA); // referent to the file containing the hash of the credentials
  return fs.readFile(pathify(skja), UTF8);
}

/**
 * Creates a new orb containing all eiee linked either directly or inversely to the page whose identifier equals to the given pageId.
 * @param {} orbId
 * @param {*} relatumId
 */
const extractSphere = async (sphere: Reference, referent: Reference, targetPath: string) => {
  return traverser.getRings(referent).then(rings => {
    if (fs.existsSync(targetPath)) {
      throw `Error: the destination orb exists already at ${targetPath}`;
    } else {
      fs.mkdirSync(targetPath);
      rings.forEach((r, index) => {
        //console.log(`#${index} ${ring.relatum.reference.name}`);
        if (r.relatum != undefined) {
          const sourcePagePath = pathify(sphere, katonoma(r.relatum));
          const targetPagePath = path.join(targetPath, katonoma(r.relatum));
          fs.copySync(sourcePagePath, targetPagePath);
        }
      });
    }
  });
}

// TODO: this should return references, and use pathify to get abstracted from file system
const getMedia = async (referent: Reference, absolute: boolean = false): Promise<string[]> => {
  // Media are not indexed, hence we retrieve them from the filesystem direclty
  const p = path.join(pathify(referent), Type.MEDIA);
  if (!fs.existsSync(p)) {
    return [];
  } else {
    // TODO: return more info than just the name
    let result: string[] = new Array<string>();
    const files = fs.readdirSync(p, { withFileTypes: true });
    // TODO: use map function instead
    files.forEach(file => {
      if (file.isFile()) {
        if (absolute === true) {
          result.push(path.join(p, file.name));
        } else
          result.push(file.name);
      }
    });
    return result;
  }
}

const isSystemFolder = (folderName: string): boolean => {
  return folderName.startsWith(".");
}

// NB: "isNew" is present so that we indicate the page is new when we know it, but if it's undefined, the function checks if the file is actually new or not. This might get optimized.
const savePage = async (referent: Reference, content: string, user: string, isNew?: boolean) => {
  // Make sure the content ends with a new line otherwise Git will complain
  if (content !== undefined && !content.endsWith("\n"))
    content += "\n";
  const targetPath = pathify(referent, BODY);
  await fs.writeFile(targetPath, content, UTF8);
  await saveMetadata(referent, user);
  // TODO: not sure this is the best option: we could also simply launch the indexing from
  // there directly (as a promise in order to not block sending a response).
  const archive = archiver.get(getSphere(referent));
  // TODO: both operations below could be in a separate thread
  if (isNew === true) {
    // TODO: check
    // add only if not the iiakhawunti folder because we don't want to store the history of the encrypted passwords
    // if (sysFolder != sys.iiakhawunti)
    await archive.add(targetPath);
  }
  await archive.commit("", targetPath, { '--allow-empty-message': null, '--author': `${user} <${user}>` });
  // Index content only if we're saving the main content (BODY), not if we're saving for instance a Wikipedia page
  traverser.indexBody(referent);
}

const saveMetadata = async (referent: Reference, user: string) => {
  const targetPath = pathify(referent, METADATA);
  let metadata: any = undefined;
  if (fs.existsSync(targetPath)) {
    const content = await fs.readFile(targetPath, UTF8);
    metadata = parse(content);
  } else {
    metadata = { "created-at": dayjs().toISOString() };
  }
  // TODO: the last committer should not change if the content was actually not changed
  metadata["last-committer"] = user;
  await fs.writeFile(targetPath, yamlize(metadata), UTF8);
}

// TODO: see what to do with rings having the page to be renamed as value (they are not present in the ring index
// because only references are indexed, not values): this is an issue for instance when renaming page ".relation",
// whose identifier is used as a value in ring "<has image> <has domain> <relation>".
// TODO: NB: relation renaming is not properly handled, the indices.relation index of the traverser should be used for that.
const rename = async (sphereId: string, fromPageId: string, toPageId: string): Promise<void> => {
  const sphere = resolve(sphereId, undefined, Type.SPHERE);
  // TODO: getRings actually returns either an array of rings or a map, this needs to get streamlined
  const sphereRef = resolve(sphereId, undefined, Type.SPHERE);
  const fromRef = resolve(fromPageId, sphereRef);
  let rings = await traverser.getRings(fromRef);
  const newRef = resolve(toPageId, sphereRef);
  // Check that the fromId exists and that the toId is available
  const from = pathify(fromRef);
  if (!fs.existsSync(from)) throw new Error("Id does not exist: " + fromPageId + " (" + from + ")");
  const to = pathify(newRef);
  if (fs.existsSync(to)) throw new Error("Id already used: " + toPageId + " (" + to + ")");
  rings.forEach((r: Ring) => {
    console.log(r);
    if (katonoma(r.relation.reference) === fromPageId) {
      r.relation = new Page(newRef);
    }
    if (r.relatum !== undefined && katonoma(r.relatum.reference) === fromPageId) {
      r.relatum = new Page(newRef);
    }
    saveRing(r);
  });
  // Then rename the page itself by moving its folder
  console.log("Moving", from, to);
  fs.moveSync(from, to);
}

const erase = async (entity: Reference): Promise<Reference> => {
  console.log("erase", entity);
  // TODO: move folder to trash and implement an empty trash function
  // TODO: add logger
  if (isSystemFolder(katonoma(entity))) {
    throw createError(401, "Forbidden");
  } else {
    const entityLocation = pathify(entity);
    if (!fs.existsSync(entityLocation)) {
      throw createError(404, "Entry not found in storage");
    } else {
      // TODO: add protection there so that only a subfolder can be deleted, not the root folder, and some rights should be checked
      //fs.rmdirSync(pagePath, { recursive: true });
      const sphere = getSphere(entity);
      let ring;
      // Keep ring in memory before removing it from storage since it is needed for updating the ring index once deleted
      if (entity.type === Type.RING)
        ring = traverser.getRing(entity);
      const trash = resolve(sys.trash, sphere, Type.SERVICE);
      const trashPath = pathify(trash);
      fs.ensureDirSync(trashPath);
      const target = resolve(katonoma(entity), trash, entity.type);
      await fs.move(entityLocation, pathify(target), { overwrite: true });
      // Unindex body and referring rings only if we're scratching an page, not a media or a ring
      if (entity.type === Type.PAGE) {
        await traverser.unindexBody(entity);
        // TODO: for each zafu, emit a signal that the zafu was deleted (but is it really needded here, since we unindex all zafus in any case?)
        //sam.unindexZafus(orbId, pageId);
        await eraseRings(entity);
      } else if (entity.type === Type.RING) {
        // keep ring in memory before deleting it from storage since it will be needed to update the index
        if (ring !== undefined)
          await traverser.unindexRing(ring);
      } else if (entity.type === Type.MEDIA) {
        // Remove file vignette if any
        const thumbnail = getThumbnailPath(entity);
        if (fs.existsSync(thumbnail)) {
          await fs.unlink(thumbnail);
          // Remove the ".thumbnails" directory if empty
          // TODO: replace dirname usage by pathify call using references 
          const thumbnails = path.dirname(thumbnail);
          if (getFiles(thumbnails).length === 0) {
            fs.rmdirSync(thumbnails);
          }
        }
        // Remove file metadata if any
        // TODO: check if needed
        const metadataPath = getMetadataPath(entity);
        if (fs.existsSync(metadataPath)) {
          await fs.unlink(metadataPath);
        }
      }
    }
    return entity;
  }
}

// Removes rings containing the page as referent or as relatum
const eraseRings = async (page: Reference) => {
  // TODO: move part of the code to kumbuk so that kumbuk.getIndices is not called externally
  const indices = await traverser.getIndices(getSphere(page));
  // TODO: handle any zafu type, not only rings
  const index = indices.rings;
  const rings = index.get(katonoma(page));
  // TODO: we may need to differentiate between the direct and inverse rings
  // For each page ring, remove the rings that pointed at the page
  if (rings !== undefined) {
    rings.forEach((ring: Ring) => {
      if (katonoma(ring.referent) === katonoma(page) && ring.relation !== undefined && ring.relation.reference !== undefined && ring.relation.reference.inverse) {
        // The ring contains the given page as referent for an inverse relation -> delete the ring from its referent page location)
        // TODO: check why no promise seems to be returned
        erase(ring.reference);
      } else {
        // The ring contains the given reference as referent -> just remove it from the index
        // (it get removed from the storage when its parent page itself gets deleted)
        traverser.unindexRing(ring);
      }
    });
  }
  // also remove entry from ringIndex
  // TODO: see how to remove the entry completely
  index.delete(katonoma(page));
}

// Adds a media attached to a page
const addMedia = async (reference: Reference, content: string): Promise<void> => {
  const mediaPath = pathify(reference);
  //resolve(file.originalname, resolve(req.params.pageId, orbx(req)), Type.MEDIA)
  const folder = dirname(mediaPath);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }
  return fs.writeFile(mediaPath, content, UTF8);
}

const saveRing = async (ring: Ring): Promise<Ring> => {
  let isNew = false;
  if (ring.reference === undefined || katonoma(ring.reference) === "") {
    ring.reference = resolve(uuid(), ring.referent.reference, Type.RING);
    isNew = true;
  }
  // TODO: in principle, we should read the written file to recreate the zafu from there before sending it back to the requester
  // The received zafu typically does not contain a referent because it is posted to the referent endpoint, so we need to add this information to the object in order to return a complete zafu which also contains the referent label
  // TODO: add logger
  // TODO: Rings can also be added so system pages, they should not be indexed, we need to add sysFolder to the list of parameters
  const location = pathify(ring.reference);
  fs.ensureDirSync(path.dirname(location));
  // What gets dumped is only the relation, the relatum reference ids, the value and the properties, not the whole received ring, which also contains labels
  let serialized: any = {
    relation: katonoma(ring.relation),
  };
  if (ring.relatum != null) serialized.relatum = katonoma(ring.relatum);
  else if (ring.value != null) serialized.value = ring.value;
  if (ring.properties != null) serialized.properties = ring.properties;
  console.log("serialized", serialized);
  fs.writeFileSync(location, yamlize(serialized));
  await traverser.labelize(ring, "default");
  if (!isNew)
    await traverser.unindexRing(ring);
  await traverser.indexRing(ring);
  return ring;
}

// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
const uuid = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const random = (Math.random() * 16) | 0,
      value = c == "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export default {
  addMedia,
  exists,
  getRandomPage,
  getPage, addPage,
  getUser, addUser,
  getUserKey,
  extractSphere,
  getMedia,
  rename,
  saveRing,
  erase,
  services,
  savePage,
}
