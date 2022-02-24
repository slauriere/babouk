/**
 * Indexing and search service.
 */
import fs from "fs-extra";
import path from "path";

import dayjs from "dayjs";
import flexSearch from "flexsearch";

import { Ker, getSphere, Relation, Page, Reference, Type, resolve, katonoma, localize, Ring } from "@babouk/model";
import { BODY, getFolderNames, pathify, getRoot, toArray, METADATA, Sort, parse, getSettings } from "../utils.js";
import pixier from "./pixier.js";

/** Orbis indices: eiee titles, texts and rings
 * - keys:  orb ids
 * - values: map whose keys are page ids and values are ...
 * TODO: rename this variable since "indices" is also used as a local variable in the functions below
 */
const indices: Map<string, any> = new Map();

// TODO: the function should take orbId as argument to ease creation of indices from an orbId directly
const getIndices = async (sphere: Reference) => {
  if (sphere === undefined) {
    throw new Error("missing orb reference");
  }
  // Add a new set of indicies to the global map of indices: one index set per orb
  // if (indices.get(orbId) === undefined) {
  //    indices.set(orbId, {});
  // }

  // Create the indices if they do not exist already
  // We use orbId.id as map key, not the sylka itself, because Map keys does not support equality customization for keys.
  // https://stackoverflow.com/questions/29759480/how-to-customize-object-equality-for-javascript-set
  // https://2ality.com/2015/01/es6-maps-sets.html
  const sphereId = katonoma(sphere);
  if (indices.get(sphereId) === undefined) {
    // Create an index for labels, rings and bodies
    // TODO: we may want to have the pageId as key, and the labels, rings, tabs as values instead
    indices.set(sphereId, {
      images: flexSearch.create(),
      labels: new Map<string, any>(),
      relations: new Map<string, any>(),
      rings: new Map<string, any>(),
      bodies: flexSearch.create({
        // tokenize: "strict",
        // depth: 3,
        doc: {
          id: "id",
          field: ["name", "language", "title", "body", "created-at", "updated-at", "creator", "last-committer"]
        }
      }),
    });

    // let options = new CreateOptions();
    // TODO: see how to pass options
    // encode: "balance",
    // tokenize: "forward",
    // threshold: 0,
    // async: false,
    // worker: false,
    // cache: false

    // Store the mapping between identifiers used for FlexSeach and the file paths names
    // NB: a FlexSearch object is a {}, so here we're just adding a property to that object
    indices.get(sphereId).bodies.identifierFileNameMap = new Map<number, Reference>();

    // Store the mapping between FlexSearch identifiers and the image identifiers
    indices.get(sphereId).images.identifierImageIdMap = new Map<number, Reference>();

    const folderNames = getFolderNames(getRoot(sphere));
    const settings = await getSettings(sphere);
    for (const pageFolderName of folderNames) {
      // TODO: we shouldn't create an page for this
      const ref = resolve(pageFolderName, sphere);
      //const bodyPath = pathify(ref, BODY);

      // console.log('indexing', tyka.avPath);
      // TODO: see how we can use async functions and chain the promises here
      // TODO: see how to propagate errors
      if (settings.locales !== undefined && settings.locales.length > 1) {
        for (const locale of settings.locales) {
          await indexBody(resolve(pageFolderName, sphere, Type.PAGE, locale));
        }
        // Also index the default language
        await indexBody(resolve(pageFolderName, sphere, Type.PAGE, "default"));
      } else {
        await indexBody(resolve(pageFolderName, sphere, Type.PAGE));
      }
      await indexRings(ref);
      await indexImages(ref);
      //}
    }

  }
  // callback(bodyIndex, ringIndexer);
  return indices.get(sphereId);
}

const indexBody = async (referent: Reference) => {
  // do not index any page that represents an account (since it contains encrypted password etc.)
  // if (sysFolder === sys.iiakhawunti) {
  //  return Promise.resolve();
  // }
  // The bodyIndex needs to be initialized
  const sphereIndices = await getIndices(getSphere(referent));
  const bodyPath = pathify(referent, BODY);
  if (!fs.existsSync(bodyPath))
    return Promise.resolve();
  const stat = await fs.stat(bodyPath);
  const mtime = stat.mtime.getTime();
  const content = await fs.readFile(bodyPath, "utf8");
  let title = content.split("\n", 1)[0];
  if (title !== undefined && title.length > 0) {
    if (title.startsWith("#")) {
      title = title.substring(1).trim();
    }
  } else {
    title = katonoma(referent);
  }
  // TODO: we want to use sylkas, not ids, but Map does not support custom equality for complex object as keys it seems
  const num = getNumericIdentifier(referent);
  // Register mapping
  sphereIndices.bodies.identifierFileNameMap.set(num, referent);
  let entry: any = { id: num, name: katonoma(referent), language: referent.language, title: title, body: content, "updated-at": mtime };
  const metadataPath = pathify(referent, METADATA);
  if (fs.existsSync(metadataPath)) {
    const str = await fs.readFile(metadataPath, "utf8");
    const metadata = parse(str);
    entry["created-at"] = dayjs(metadata["created-at"]);
    entry["last-committer"] = metadata["last-committer"];
  }
  // TODO: add name to content for indexing the name itself since issue with structured field indexing
  // TODO: should we use update instead?
  sphereIndices.bodies.add(entry);
}

const indexImage = async (image: Reference) => {
  // TODO: don't index zafus added to system eeiee, or not in the same index
  // The zafuIndexer needs to be initialized
  // There is one index per zafu type: one for rings, etc.
  const sphereIndices = await getIndices(getSphere(image));
  // TODO: we want to use sylkas, not ids, but Map does not support custom equality for complex object as keys it seems
  const num = getNumericIdentifier(image);
  // Register mapping
  sphereIndices.images.identifierImageIdMap.set(num, image);
  // TODO: add name to content for indexing the name itself since issue with structured field indexing
  let text = katonoma(image) + " " + katonoma(image.set);
  if (image.set !== undefined) {
    text += " " + getTitle(image.set);
  }
  sphereIndices.images.add(num, text);
}

const indexImages = async (referent: Reference) => {
  const mediaPath = path.join(pathify(referent), Type.MEDIA);
  if (fs.existsSync(mediaPath)) {
    fs.readdirSync(mediaPath)
      .filter(filePath => pixier.isImage(filePath))
      .forEach(filePath => {
        // sconst ringPath: string = path.join(ringsPath, fileName);
        // TODO: remove extension more correctly
        const ref = resolve(path.basename(filePath), referent, Type.MEDIA);
        indexImage(ref);
      });
  }
}

const indexRing = async (ring: Ring) => {
  // TODO: don't index rings added to system pages, or not in the same index
  // The indexer needs to be initialized
  const sphereIndices = await getIndices(getSphere(ring.reference));
  if (ring.reference.set !== undefined) {
    // Index the ring as an outgoing one from referent to relatum
    // TODO: shouldn't it be z.referent.set instead
    // if (indices.rings.get(katonoma(r.reference.set)) === undefined) indices.rings.set(katonoma(r.reference.set), []);
    // indices.rings.get(katonoma(r.reference.set)).push(r);
    if (sphereIndices.rings.get(katonoma(ring.referent)) === undefined) sphereIndices.rings.set(katonoma(ring.referent), []);
    sphereIndices.rings.get(katonoma(ring.referent)).push(ring);
  }
  if (ring.relation !== undefined && ring.relation.reference !== undefined && ring.relatum != null && ring.relatum !== undefined) {
    // Index the ring as an outgoing one from relatum to referent with the inverse relation
    if (sphereIndices.rings.get(katonoma(ring.relatum)) === undefined) sphereIndices.rings.set(katonoma(ring.relatum), []);
    // TODO: probably affect a virtual identifier to the ring which has the inverse relation (unless we consider it's the actually a unique ring which has two representations)
    // TODO: implement relation:clone()
    // TODO: keep the relation domain and image
    const inverseRelationReference = new Reference(katonoma(ring.relation.reference), ring.relation.reference.set, Type.PAGE, "default", true);
    const inverseRelation = new Relation(inverseRelationReference, ring.relation.title, ring.relation.body, undefined, undefined);
    const inverseRing = new Ring(ring.reference, ring.relatum, inverseRelation, ring.referent, undefined, ring.properties);
    sphereIndices.rings.get(katonoma(inverseRing.referent)).push(inverseRing);
  }
  if (ring.relation != null && ring.relation !== undefined) {
    // Add the ring to the relation index
    if (sphereIndices.relations.get(katonoma(ring.relation)) === undefined) sphereIndices.relations.set(katonoma(ring.relation), []);
    sphereIndices.relations.get(katonoma(ring.relation)).push(ring);
  }
}

const indexRings = async (referent: Reference) => {
  const ringPath = path.join(pathify(referent), Type.RING);
  if (fs.existsSync(ringPath)) {
    fs.readdirSync(ringPath)
      .filter(filePath => filePath.slice(-5) === ".yaml")
      .forEach(fileName => {
        // sconst ringPath: string = path.join(ringsPath, fileName);
        // TODO: remove extension more correctly
        const z: Ring = getRing(resolve(fileName.substring(0, fileName.length - 5), referent, Type.RING));
        indexRing(z);
      });
  }
}

// get instances of a given type id
const getInstances = async (sphere: Reference, xtype?: Reference): Promise<Page[]> => {
  // TODO: use constants variables rather than strings for '.aek', '.typ', etc.
  const ttype = xtype !== undefined ? xtype : resolve(Ker.TYPE, sphere);
  // Filter only rings with relation "is a" and relatum "type"
  const rings = await getRings(ttype, resolve(Ker.IS_A, sphere, Type.PAGE, "default", true), ttype);
  // TODO: use "ring: Ring" instead of "ring: any"
  return rings.map((r: any) => r.relatum);
}

const getRelation = async (ref: Reference): Promise<Relation> => {
  const rings = await getRings(ref);
  const domain = rings.filter(r => katonoma(r.relation) === Ker.HAS_DOMAIN);
  const image = rings.filter(r => katonoma(r.relation) === Ker.HAS_IMAGE);
  const label = await getTitle(ref);
  return new Relation(
    ref, label, undefined,
    domain.length > 0 ? domain[0].value : undefined,
    image.length > 0 ? image[0].value : undefined
  );
}

const getTypes = async (referent: Reference): Promise<Reference[]> => {
  const rings = await getRings(referent, resolve(Ker.IS_A, referent.set, Type.PAGE, "default", false));
  return rings.map((r: any) => r.relatum);
}

// Searches all relations that are compatible with a given term as referent, if any, otherwise returns all existing relations
const getRelations = async (sphere: Reference, referent?: Reference): Promise<Relation[]> => {
  // TODO: use constants variables rather than strings for '.aek', '.typ', etc.
  // TODO: a dedicated aek type is needed, with the additional properties "domain", "image"
  const relationables: Relation[] = [];
  // We get all the existing relations, then we keep only the ones whose domain is compatible with the type(s) of the given referent (eio), if any.
  const relationPages = await getInstances(sphere, resolve(Ker.RELATION, sphere));
  for (const relationPage of relationPages) {
    // TODO: instead of converting a page into an relation, see if izug could return relations[] directly, with dynamic typing
    // This turns an page into an relations
    // TODO: create function that returns all exiting relations (or use this one with undefined referent)
    const rel = await getRelation(relationPage.reference);
    // In case of a referent argument, keep only relations whose domain is compatible with this referent types.
    if (referent !== undefined && rel.domain !== undefined && rel.domain !== "*") {
      // TODO: the types should be computed just once and for all, not for every relation
      const types = (await getTypes(referent)).map(t => katonoma(t));
      // The relation domain can be a single type or an array of type, so we iterate over them
      let added = false;
      rel.domain.split("|").forEach(item => {
        if (!added && types.includes(item)) {
          relationables.push(rel);
          added = true;
        }
      });
    } else {
      relationables.push(rel);
    }
  }

  // let compatibleRelations: relations[] = [];
  // for (const aek of relations) {
  //   // In case the page has no type, only the relations with an empty domain are considered compatible
  //   //if (tyka.ypeIds.length === 0 && (aek.domain === undefined || aek.domain === "*")) {
  //   compatibleRelations.push(aek);
  //   //} else if (tyka.ypeIds.includes(aek.domain) || aek.domain === "*") {
  //   // Otherwise, a relation is compatible if its domain is contained in the current resource type(s)
  //   //compatibleRelations.push(aek);
  //   //}
  // }
  return relationables;
};

// Searches the terms that belong to the image of a given relation and that match the provided text
// NB: we need the orb because the relation can be undefined
// "any" is used for text as it can be a string or a ParsedQ for now when called from routes.ts
// TODO: rename to searchRelatables or something expressin we search across relata candidates
const searchRelatum = async (sphere: Reference, rel?: Reference, text?: string): Promise<Page[]> => {
  // TODO: the eiee get mapped to {id, index} in the search function, here we unmap them, this should be avoided
  if (rel !== undefined) {
    const rela = await getRelation(rel);
    // TODO: optimize
    // the result is the intersection between the ids of eiee matching the input text (if any text input was provided)
    // and the ones of the relation image set (if any relation was provided)
    // TODO: the relationImage can be "any", in that case we don't want to retrieve the whole set of page ids
    // TODO: the referents should probably be added as well
    const image = rela.image;
    if (image !== undefined && image !== "*") {
      // We get the whole relation image by obtaining the referents that have a relation to one of the image element, then we filter by text
      const types = image.split("|");
      // TODO: declare eiee as an page[] instead, but issue with (page|undefined)[]
      let pages: any = [];
      for (const t of types) {
        const rings = await getRings(resolve(t, sphere));
        // TODO: we should keep only the referents which have a relation "is a" to the image
        let relatums = rings.map(r => { if (katonoma(r.relation) === Ker.IS_A) return r.relatum });
        // We filter out the undefined referents that may exist when there are rings involving the image with a different relation than "is a"
        relatums = relatums.filter(referent => referent !== undefined);
        // compute the union
        pages = [...new Set([...pages, ...relatums])];
      }
      if (text !== undefined && text.length > 0) {
        const matchingTextPages = await search(sphere, { text });
        const matchingTextPageIds = matchingTextPages.map((referent: Page) => katonoma(referent));
        // TODO: we should filter not only on the id but also on the page title
        // TODO: optimize the intersection of two sets which can possibly be large
        pages = pages.filter((e: Page) => matchingTextPageIds.includes(katonoma(e)));
      }
      // TODO: deduplication: duplicates can occur because rings can have multiple times the same relatum return [...new Set(eiee)];
      return pages;
    } else if (text !== undefined && text.length > 0) {
      const matchingTextPages = await search(sphere, { text });
      return matchingTextPages;
    } else {
      return [];
    }
  } else {
    return await search(sphere, { text });
  }
}

// TODO: return a consistent type: array of page? Making ring inherit from page? Or introduce a higher level Type.
const search = async (sphere: Reference, query: any): Promise<any[]> => {
  // TODO: on first request, we should wait that the FlexSearch has finished indexing before performing the search, but what is the way to be notified that the index has been built?
  // TODO: the index creation should be launched on server start, however in case of multiple spheres, there could be no point indexing all of them if not all will eventually get accessed
  if (query.text !== undefined && query.text.trim().length > 0) {
    const text = query.text.trim();
    if (text === "*") {
      const pages = await getPageIndex(sphere, query);
      return pages;
    } else {
      // NB: page type is used rather than reference because labels are needed as well
      const pages = await searchBody(sphere, query);
      return pages;
    }
  } else if (query.referent !== undefined) {
    // For now we're trying for a ring
    // indices.rings.
    // TODO: move this to a searchRing function
    const rings = await getRings(resolve(query.referent, sphere), resolve(query.relation, sphere), resolve(query.relatum, sphere));
    return rings;
  } else {
    return new Array<Page>();
  }
}

const searchImages = async (sphere: Reference, query: any): Promise<Reference[]> => {
  if (query.text !== undefined && query.text.trim().length > 0) {
    const text = query.text.trim();
    const sphereIndices = await getIndices(sphere);
    const entries = sphereIndices.images.search(text);
    const images = new Array<Reference>();
    for (const entry of entries) {
      const ref = await getImageReference(entry, sphere);
      images.push(ref);
    }
    return images;
  } else {
    return new Array<Reference>();
  }
}

// This is close to 'search' except it does just list all available pages.
const getPageIndex = async (sphere: Reference, query: any = {}): Promise<Page[]> => {
  const sphereIndices = await getIndices(sphere);
  const pages = sphereIndices.bodies.where(() => true).map((entry: any) => docToPage(entry, sphereIndices.bodies));
  const sort = Sort.parse(query.sort);
  console.log("sort", query, sort);
  if (sort !== undefined) {
    if (sort.field === "updatedAt") {
      return pages.sort((a: Page, b: Page) => sort.compareNumbers(a, b));
    } else {
      return pages.sort((a: Page, b: Page) => sort.compareStrings(a, b, "fr"));
    }
  } else {
    return pages;
  }

}

const docToPage = (doc: any, sphereBodyIndex: any): Page => {
  const ref = sphereBodyIndex.identifierFileNameMap.get(doc.id);
  const metadata = getMetadata(doc.id, sphereBodyIndex);
  return new Page(ref, doc.title, undefined, undefined, metadata["created-at"], doc["updated-at"], undefined, metadata["last-committer"]);
}

// TODO: return references rather than string identifiers, but still as a promise
const searchBody = async (sphere: Reference, query: any): Promise<Page[]> => {
  const sphereIndices = await getIndices(sphere);
  return sphereIndices.bodies.search({ field: ["name", "body"], query: query.text, bool: "or", suggest: true }).map((entry: any) => docToPage(entry, sphereIndices.bodies));
}

// TODO: we should call getorbIndices in the function below first, but this raises an issue with promises / await in caller functions
// takes {id, referent, relation, relatum} as input and returns {id, referent: {id, label}, relation: {....}}
const labelize = async (r: Ring, language: string) => {
  r.referent.title = await getTitle(localize(r.referent.reference, language));
  if (r.relation !== undefined) {
    r.relation.title = await getTitle(localize(r.relation.reference, language));
  }
  if (r.relatum !== undefined) {
    r.relatum.title = await getTitle(localize(r.relatum.reference, language));
  }
}

const getTitle = async (ref: Reference): Promise<string> => {
  if (ref === undefined) {
    console.log("[getTitle] undefined reference");
    return Promise.resolve("");
  }
  const sphereIndices = await getIndices(getSphere(ref));
  const id = getNumericIdentifier(ref);
  const doc = sphereIndices.bodies.find(id);
  if (doc != null)
    return doc.title;
  console.log("[getTitle] no FlexSearch doc found for", ref);
  return katonoma(ref);
}

// TODO: merge with getLabel so that there is just one function that returns all page fields that are available in the index
const getMetadata = (docId: number, sphereBodyIndex: any): any => {
  const doc = sphereBodyIndex.find(docId);
  if (doc != null)
    return { "created-at": doc["created-at"], "last-committer": doc["last-committer"] };
  console.log("[getMetadata] no FlexSearch doc found for", docId);
  return {};
}

// const getReference = (id: number, index: any): Reference => {
//   // TODO: rename to identifierFolderNameMap
//   //const indices = await getIndices(sphere);
//   return index.identifierFileNameMap.get(id);
// }

const getImageReference = async (id: number, sphere: Reference): Promise<Reference> => {
  // TODO: rename to identifierFolderNameMap
  const sphereIndices = await getIndices(sphere);
  return sphereIndices.images.identifierImageIdMap.get(id);
}

// TODO: check unicity
const getNumericIdentifier = (referent: Reference): number => {
  let hash = 0;
  const name = katonoma(referent);
  if (name.length === 0) return 0;
  let str = name;
  // + "." + language;
  if (referent.type === Type.PAGE)
    str = name + "." + referent.language;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

const unindexBody = async (referent: Reference) => {
  if (referent.set === undefined)
    return;
  const sphereIndices = await getIndices(referent.set);
  const bodyIndex = sphereIndices.bodies;
  const indexId = getNumericIdentifier(referent);
  // Unregister mapping and index entry
  bodyIndex.identifierFileNameMap.delete(indexId);
  bodyIndex.remove({ id: indexId });
}

const unindexRing = async (ring: Ring) => {
  const sphereIndices = await getIndices(getSphere(ring.reference));
  const ringIndex = sphereIndices.rings;
  // TODO: consider making "serialize" a class function of "page"
  // Update rings of this ring referent
  if (ring.referent !== undefined) {
    const index = ringIndex.get(katonoma(ring.referent));
    if (index !== undefined) {
      ringIndex.set(katonoma(ring.referent), index.filter((item: Ring) => {
        return katonoma(item) !== katonoma(ring);
      }));
    }
  }

  // Update rings of this ring relatum
  if (ring.relatum != null) {
    const index = ringIndex.get(katonoma(ring.relatum));
    if (index !== undefined) {
      ringIndex.set(katonoma(ring.relatum), index.filter((item: Ring) => {
        return (!(katonoma(item.relatum) === katonoma(ring.referent) && item.relation.reference.inverse === true));
      }));
    }
  }

  // Update relation index
  // TODO: check
  if (ring.relation != null) {
    const relationIndex = sphereIndices.relations;
    const index = relationIndex.get(katonoma(ring.relation));
    relationIndex.set(katonoma(ring.relation), index.filter((item: Ring) => {
      return !(katonoma(item.referent) === katonoma(ring.referent) && katonoma(item.relatum) === katonoma(ring.relatum));
    }));
  }
}

// TODO: probably add labels to ring just like when getting rings via getrings
const getRing = (ref: Reference): Ring => {
  // TODO: move the file reading to store
  // TODO: check file exists
  // TODO: we may use async instead
  const p = pathify(ref);
  const text = fs.readFileSync(p, "utf8");
  const data = parse(text) as any;
  // const folders = path.dirname(p).split(path.sep);
  // if (data.relation === undefined)
  // console.log("warning: undefined relation", z, data);
  const relatum = data.relatum !== undefined ? new Page(resolve(data.relatum, getSphere(ref))) : undefined;
  if (ref.set === undefined)
    throw new Error("undefined orb for ring: " + ref);
  return new Ring(ref, new Page(ref.set), new Page(resolve(data.relation, getSphere(ref))), relatum, data.value, data.properties);
}

/**
 * Gets all rings where the given page reference is involved either as a referent or as a relatum. Accepts either one or several relations as parameters. If "relation" is an array, the relation path is walked from first relation to last.
 * TODO: either add function for retrieving only rings from a given referent or to a given relatum, or add a parameter to this function to indicate whether bidirectional rings should be returned, or only the ones outgoing from the given referent.
 * TODO: possibly consider the relations argument is always an array if this makes things simpler.
 * The squash mode indicates what should be used as referent(s) for the final rings: either the referent given as argument (0, default), or the ones of the last rings in the path (1).
 * @param referent
 * @param relations
 * @param relatum
 */
const getRings = async (referent: Reference, relations?: Reference | Reference[], relatum?: Reference, types?: Reference[], squashMode: number = 0, sortBy?: string | string[], language?: string): Promise<Ring[]> => {
  const indices = await getIndices(getSphere(referent));
  if (referent.type === Type.SPHERE) {
    // Return the map of rings: Map<pageId: string, rings: Ring[]>
    return indices.rings;
  } else if (referent.type === Type.PAGE) {
    let rings = indices.rings.get(katonoma(referent)) || [];

    const maybeGetPropertyValue = (a: Ring, sortBy: string): number => {
      if (a.properties === undefined)
        return Infinity;
      else if (a.properties[sortBy] === undefined)
        return Infinity;
      else
        return a.properties[sortBy];
    }

    if (relations !== undefined) {
      const rels = toArray(relations);
      const sort = toArray(sortBy);

      // For each relation, we get the rings of each ring relatum
      // Example: referent =  "beaubourg" and relations = ["has-address", "has-geolocation"]: we have at hand the rings of "beaubourg",
      // with relation "has-address", e.g. ["beaubourg", "has-address", "place-george-pompidou"])
      // and we want to retrieve the rings whose referent is the relatum of the latter ("place-george-pompidou") and whose relation
      // is the iterated one. So for each ring, we get the rings of their relatum and we filter them on the iterated relatoin.

      const filterRingsByRelatumType = (rings: any[], typeReference: Reference): any[] => {
        // If the types parameter is not empty, keep only rings whose relatum page has a type which matches the one at the current index of the types array
        // if types name equals "*", it means no filtering should be applied
        //if (types !== undefined && types.length > index && types[index] !== undefined && katonoma(types[index]) !== '*') {
        if (typeReference !== undefined && katonoma(typeReference) !== '*') {
          rings = rings.filter((r: Ring) => {
            // If relatum is undefined, filter out, since a page is expected, since a type is needed
            if (r.relatum === undefined)
              return false;
            const rings2 = indices.rings.get(katonoma(r.relatum));
            // result = [...new Set([...result, ...rings2.filter((ring2: Ring) => katonoma(ring2.relation) === ".is-a" && types.some(t => katonoma(ring2.relatum) === katonoma(t)))])];
            // rings = rings.filter((ring2: Ring) => katonoma(ring2.relation) === ".is-a" && types.some(t => katonoma(ring2.relatum) === katonoma(t)))])];
            if (rings2 !== undefined)
              return rings2.some((r2: Ring) => katonoma(r2.relation) === ".is-a" && katonoma(r2.relatum) === katonoma(typeReference));
            return false;
          });
        }
        return rings;
      }

      rels.forEach((relation, index) => {
        const relationId = katonoma(relation);

        // TODO: the first relation has to be handled separately in case there is a relatum argument, but check if it can be optimized
        // in particular could be: if (index === 0 & relatum !== undefined && rels.length === 1)
        // Also: check if inverse relations are supported at a higher index (it seems it's not the case currently)
        if (index === 0) {
          // in case there is just one relation in total and the relatum is not empty, we filter both at once
          // Typically used by: getInstances(referent, type)
          if (relatum !== undefined && rels.length === 1) {
            const relatumId = katonoma(relatum);
            rings = rings.filter((r: Ring) => {
              // if (relation.inverse === false)
              // return katonoma(r.relation) === relationId && katonoma(r.relatum) === relatumId
              // else
              return katonoma(r.relation) === relationId && r.relation.reference.inverse === relation.inverse && katonoma(r.referent) === relatumId
            }
            );
          } else {
            rings = rings.filter((r: Ring) => katonoma(r.relation) === relationId && r.relation.reference.inverse === relation.inverse);
            if (types !== undefined && types.length > index) {
              rings = filterRingsByRelatumType(rings, types[index]);
            }
            if (sort[0] !== undefined && sort[0] !== "") {
              rings.sort((a: Ring, b: Ring): number => {
                return maybeGetPropertyValue(a, sort[0]) - maybeGetPropertyValue(b, sort[0]);
              });
            }
          }
        } else {
          let result = new Array<Ring>();
          rings.forEach((ring: Ring) => {
            const rings2 = indices.rings.get(katonoma(ring.relatum));
            if (index === rels.length - 1 && relatum !== undefined) {
              // If the relatum is not empty and we are dealing with the last relation, we filter on the relatum.
              const relatumId = katonoma(relatum);
              result = [...new Set([...result, ...rings2.filter((ring2: Ring) => katonoma(ring2.relation) === relationId && katonoma(ring2.relatum) === relatumId)])];
            } else {
              result = [...new Set([...result, ...rings2.filter((ring2: Ring) => katonoma(ring2.relation) === relationId)])];
            }
          });

          if (types !== undefined && types.length > index) {
            result = filterRingsByRelatumType(result, types[index]);
          }

          // We "squash" the rings (see Git squash for commits): if squashMode is "0", we consider the referent is the one given as argument, considering the relations are transitive, if it is "1", the referents of the last obtained rings are used.
          // e.g. ["beaubourg", "has-address", "place-george-pompidou"] and ["place-george-pompidou", "has-coordinates", [42.3, 48.4]]
          // becomes: ["beaubourg", "has-coordinates", [42.3, 48.4]]
          rings = result.map((r: Ring) => {
            let referentPage = new Page(referent);
            if (squashMode === 1) {
              referentPage = r.referent;
            }
            return new Ring(r.reference, referentPage, r.relation, r.relatum, r.value, r.properties);
          });

          if (sort.length > index && sort[index] !== undefined && sort[index] !== "") {
            rings.sort((a: Ring, b: Ring): number => {
              return maybeGetPropertyValue(a, sort[index]) - maybeGetPropertyValue(b, sort[index]);
            });
          }
        }
      })

      // if (relatum === undefined) {
      //   // Keep all rings matching referent and relation
      //   rings = rings.filter((z: Ring) => katonoma(z.relation) === relationId);
      // } else {
      //   // Keep all rings matching referent, relation and relatum
      //   const relatumId = katonoma(relatum);
      //   // TODO: use equals function instead
      //   rings = rings.filter((z: Ring) => katonoma(z.relation) === relationId && z.relatum !== undefined && katonoma(z.relatum) === relatumId);
      // }
    }
    // we add the title information on the fly in order to avoid storing the title information in the rings index itself while it's already stored
    // in the title index
    const result = new Array<Ring>();
    for (const ring of rings) {
      await labelize(ring, language ? language : referent.language);
      result.push(ring);
    }
    return result;
  } else {
    // TODO: use logger
    console.log("warning: 'getRings' unexpected entity:", referent);
    return [];
  }
}

const getRingsCrossing = async (relation: Reference): Promise<Ring[]> => {
  const indices = await getIndices(getSphere(relation));
  const rings = indices.relations.get(katonoma(relation)) || [];
  return rings;
}

export default {
  getIndices, indexBody, getInstances,
  getPageIndex,
  getRelation, getRelations, searchRelatum, search,
  labelize, getTitle, getMetadata,
  indexRing,
  getRingsCrossing,
  unindexBody, unindexRing,
  getRings, getRing, searchImages
}