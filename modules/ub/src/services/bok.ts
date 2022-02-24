import epub from "epub-gen";
import yaml from "js-yaml";

import zevir from "@babouk/zevir";
import { getSphere, Reference, Type, resolve } from "@babouk/model";

import store from "./store.js";
import { getBoka, pathify, getRoot } from "../utils.js";

const druk = async (eie: Reference) => {
  const page = await store.getPage(eie);
  const metadata = yaml.safeLoad(page.body) as any;
  const cover = metadata.cover;
  console.log(metadata);
  let coverPath = undefined;
  if (cover != undefined) coverPath = pathify(resolve(cover, eie, Type.MEDIA));
  let array: any[] = []
  let options = {
    title: metadata.title,
    author: metadata.author,
    publisher: metadata.publisher,
    cover: coverPath,
    tocTitle: "Table",
    css: `
      .citation { margin-left: 2rem; font-style: italic; }
      figure { max-width: 80%; text-align: center; }
      figcaption { margin-top: 1rem; font-style: italic; }
      .right { text-align: right; margin-right: 2rem; }
      .fbox {border: 1px solid #000; padding: 1rem; max-width: 50%; }
      ul.fbox { padding-left: 2rem; }
      ol.list-alpha { list-style-type: lower-alpha; }`,
    appendChapterTitles: false,
    content: array
  }

  const root = getRoot(getSphere(eie));
  const chapters = metadata.chapters;
  for (const chapter of chapters) {
    const chapterPage = await store.getPage(resolve(chapter, getSphere(eie)));
    let html = await zevir.htmlize(chapterPage.body);
    if (root != undefined) {
      html = html.replace(/src="([^"]*)"/gi, 'src="' + root + '/$1"');
    }
    options.content.push({
      title: chapterPage.title,
      data: html
    });
  }
  const id = metadata.id != undefined ? metadata.id : eie;
  return new epub(options, getBoka(getSphere(eie)) + `/bokz/${id}.epub`).promise;
  // TODO: issue when an error is raised
}

export default {
  druk
}