"use strict";

import wikijs from "wikijs";

import { resolve, Ring, Reference, Type } from "@babouk/model";
import store from "./store.js"
import traverser from "./traverser.js"
import { mdize } from "./mdizer.js";
import { pathify } from "../utils.js";

const wikipedia = (wikijs as any).default({ apiUrl: 'https://fr.wikipedia.org/w/api.php' });

const download = async (wikipediaPageId: string, referent: Reference) => {
  const regexp = /^(.{2}):(.*)/i;
  const result = regexp.exec(wikipediaPageId);
  if (result != null) {
    const page = await wikipedia.page(result[2]);
    const html = await page.html();
    let text = (await mdize(html)).trim();

    text = text.replace(/ {2,}/g, " ");
    text = text.replace(/[\n]{3,}/g, "\n");

    text = text.replace(/\| -{3,}/g, "| -");
    text = text.replace(/\\\[ \]/g, "");

    text = text.replace(/\/\/upload.wikimedia/g, "https://upload.wikimedia");

    text = text.replace(/\[!\[Page d’aide sur la paronymie\][^\n]*\n/, "");
    text = text.replace(/\[!\[Page d’aide sur l’homonymie\][^\n]*\n/, "");
    text = text.replace(/Pour les articles homonymes[^\n]*\n/, "");

    text = text.replace(/\[!\[Voir et modifier les données sur Wikidata\]\([^)]*\)\]\([^)]*\)/gi, "");

    text = text.replace(/\[modifier\]\([^)]*\)/gi, "");
    text = text.replace(/\[modifier le code\]\([^)]*\)/gi, "");
    text = text.replace(/\[modifier wikidata\]\([^)]*\)/gi, "");
    text = text.replace(/\[!\[Documentation du modèle²\]\([^)]*\)\]\([^)]*\)/gi, "");

    text = text.replace(/\\\[ \\\| \]/gi, "");

    text = text.replace(/## Sommaire.+?(?=##)/gis, "")
    text = text.replace(/##(#?) Liens externes.*/gis, "")

    text = text.replace(/\*\*Cet article est [^\n]*\n/, "");
    text = text.replace(/Vous pouvez partager vos connaissances [^\n]*\n/, "");

    //text = text.replace(/\\\[\[modifier\]\([^)]*\) \\\| \[modifier le code\]\([^)]*\)\]/g, "");
    text = text.replace(/\(\/wiki\/([^\s]*)\s"[^"]*"\)/g, "(https://fr.wikipedia.org/wiki/$1)");

    // remove first line since it contains the title
    text = text.trim().replace(/^.*$/m, "").trim();

    console.log(pathify(referent));
    const reference = resolve("wikipedia." + result[1] + ".md", referent, Type.MEDIA);
    store.addMedia(reference, text);
  }
}

const search = async (sphere: Reference, relationId: string): Promise<Ring[]> => {
  const relation = resolve(relationId, sphere);
  const rings = await traverser.getRingsCrossing(relation);
  return rings;
}


export default {
  download,
  search
}