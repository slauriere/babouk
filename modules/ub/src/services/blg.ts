"use strict";
import command from "commander";

import fs from "fs-extra";
import path from "path";

import yaml from "js-yaml";

import { Page, katonoma, normalize, resolve, Reference, Ring, Type } from "@babouk/model";
import store from "./store.js";
import traverser from "./traverser.js";
import { mdize, mdizeSync } from "./mdizer.js";
import { getRandomHex, pathify } from "../utils.js";

const MEDIA = "media";
const AUTHOR = "blg";

/**
 * Converts an HTML page into a Markdown down and stores it into a dedicated folder.
 * @param root guide input folder
 * @param page page object with path reference and identifier
 */
const importPage = async (root: string, page: any, sphere: Reference, guideId: string, data: any): Promise<Page> => {
  console.log("Creating page ", page.title, page.path);

  if (page.path !== undefined) {
    let content = await getBlgPageContent(root, page);

    // Handle galleries
    const galleries: any = data.galleries;
    const images: any = data.images;
    content = content.replace(/\[!\[\]\([^)]*\)!\[\]\([^)]*\)\]\(bluelion:\/\/gallery\/([^)]*)\)\n(.*)\n(.*)/g, (match: string, ...args: any[]): string => {
      const gallery: any = galleries[args[0]];
      const str = addGallery(gallery, data, guideId);
      return str;
    });

    // Replace image references
    content = content.replace(/!\[\]\(images\/([^)]*)\)\n\n([^\n]*)/g, "::: gallery\n- title: \"$2\"\n  src: " + `$1@${guideId}\n` + ":::");

    // Handle plan markers
    content = content.replace(/\[!\[\]\([^)]*\)\]\(bluelion:\/\/plan\/([^\/]*)\/([^)]*)\)\n[^\n]*\n(.*)/g, (match: string, ...args: any[]): string => {
      //const marker: any = galleries[args[0]];
      //let str = "::: section gallery";
      // for (const imageReference of gallery.images) {
      //   const image = images[imageReference.imageId];
      //   let md = mdizeSync(imageReference.description);
      //   md = md.replace(/"/g, "\\\"");
      //   str += `\n![${md}](${guideId}/${MEDIA}/${image.path.substring("images/".length)} "${md}")`
      // }
      const plan = data.plans[args[0]];
      const marker = plan.markers.filter((marker: any) => marker.id === args[1])[0];
      return `[${args[2]}](plan-${args[0].substring(0, 6)}#${marker.label})`;
    });

    // Handle Wikipedia links
    content = content.replace(/\(bluelion:\/\/page\/([^)]*)\)/gi, (match: string, ...args: any[]): string => {
      const pageId = args[0];
      if (data.pages[pageId] !== undefined && data.pages[pageId].url !== undefined && data.pages[pageId].url.indexOf("wikipedia") > 0) {
        return "(" + data.pages[pageId].url + ")";
      }
      console.log("**** warning", match);
      return match;
    });

    // Generate block for top gallery
    const topGalleryId = page.topGalleryId;
    let topGallery = "";
    if (topGalleryId !== undefined) {
      const gallery = data.galleries[topGalleryId];
      topGallery = addGallery(gallery, data, guideId);
    }


    // Add page metadata
    let metadata: any = {};
    if (page.subtitle !== undefined) metadata.subtitle = page.subtitle;
    if (page.summary !== undefined) metadata.summary = page.summary;
    if (page.placeinfoId !== undefined) {
      metadata.info = data.pages[page.placeinfoId];
      delete metadata.info.id;
      delete metadata.info.path;
      delete metadata.info.title;
      delete metadata.info.url;
      delete metadata.info.galleryIds;
    }
    if (topGalleryId !== undefined) {
      const gallery = data.galleries[topGalleryId];
      let im: any = {};
      if (gallery.images.length > 1) {
        im = gallery.images[1];
      } else {
        im = gallery.images[0];
      }
      const topImageObj = data.images[im.imageId];
      const topImage = topImageObj.path.substring("images/".length);
      metadata.image = `${topImage}@${guideId}`;
    }

    if (page.iconId !== undefined) metadata.icon = data.images[page.iconId].path.replace("images/", "") + "@" + guideId;
    let metadataStr = "" + yaml.safeDump(metadata) + "```";
    metadataStr = metadataStr.replace(/ >-\n/g, " |-\n");
    metadataStr = metadataStr.replace(/<[^>]*>/g, "\n    "); // this is to replace <br xmlns="http://www.w3.org/1999/xhtml"/> by line breaks

    let hero = "::: hero\n" + metadataStr + "\n:::\n";

    content = `# ${page.title}\n\n${hero}\n${topGallery}\n${content}`;
    let xpage = undefined;
    try {
      xpage = await store.addPage(resolve(page.title, sphere), AUTHOR, content);
    } catch (e) {
      // Page exists already -> add random suffix to the identifier
      xpage = await store.addPage(resolve(page.title, sphere), AUTHOR, content, normalize(page.title) + "-" + getRandomHex(6));
    }

    // Add point coordinates
    if (page.geo !== undefined) {
      const hasCoordinates = await traverser.getRelation(resolve(".has-coordinates", sphere, Type.PAGE));
      const r = new Ring(resolve("", xpage.reference, Type.RING), xpage, hasCoordinates, undefined, page.geo.reverse());
      await store.saveRing(r);
    }

    // Add audio
    if (page.audioId !== undefined) {
      const audio = data.binaries[page.audioId];
      const media = resolve(MEDIA, xpage.reference, Type.SERVICE);
      await fs.mkdir(pathify(media));
      fs.copyFileSync(
        path.join(root, audio.path),
        path.join(pathify(media), "audio.mp3"));
    }

    return xpage;
  } else {
    let xpage = undefined
    try {
      xpage = await store.addPage(resolve(page.title, sphere), AUTHOR, page.content);
    } catch (e) {
      // Page exists already -> add random suffix to the identifier
      xpage = await store.addPage(resolve(page.title, sphere), AUTHOR, page.content, normalize(page.title) + "-" + getRandomHex(6));
    }
    return xpage;
  }
}

/**
 * Inserts a gallery block into a page by iterating over the images metadata.
 * @param gallery gallery object to be inserted
 * @param data  guide bundle
 * @param guideId guide identifier
 */
const addGallery = (gallery: any, data: any, guideId: string): string => {
  let counter = 0;
  let str = "::: gallery\n```";
  let topImageTitle = "";
  for (const imageReference of gallery.images) {
    const image = data.images[imageReference.imageId];
    let md = mdizeSync(imageReference.description);
    md = md.replace(/"/g, "\\\"");
    md = md.replace(/\n/g, " ");
    md = md.replace(/ {2,}/g, " ");
    if (counter === 0) {
      topImageTitle = md;
    } else {
      if (counter === 1) {
        md = "title: \"" + topImageTitle + "\"\n  caption: \"" + md + "\"";
      } else {
        md = "title: \"" + md + "\"";
      }
      if (image !== undefined) {
        str += `\n- ${md}\n  src: ${image.path.substring("images/".length)}@${guideId}`
      } else {
        console.log("Missing image: " + JSON.stringify(imageReference));
      }
    }
    counter++;
  }
  str += "\n:::\n"
  return str;
}

/**
 * Copies all guide images in the target guide folder.
 * @param root guide input folder
 * @param images dictionary of guide images
 * @param guideFolder target folder
 */
const copyImages = async (root: string, images: any, guide: Reference) => {
  const media = resolve(MEDIA, guide, Type.SERVICE);
  const guideMediaDir = pathify(media);
  await fs.mkdir(guideMediaDir);
  Object.entries(images).forEach((image: any) => {
    const imagePath = path.join(root, image[1].path);
    const imageFileName = path.basename(imagePath);
    fs.copyFileSync(imagePath, path.join(guideMediaDir, imageFileName));
  });
}

/**
 * Returns the HTML content of a page
 * @param root input guide root folder
 * @param page page object
 */
const getBlgPageContent = async (root: string, page: any): Promise<string> => {
  let pagePath = page.path;
  pagePath = path.join(root, pagePath);
  let input = await fs.readFile(pagePath, { encoding: 'utf8' });
  input = input.replace("<base href='../' />", "");
  const file = await mdize(input);
  return file;
}

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Command line invooKer. */
command
  .command("convert <input-folder> <sphere-id>")
  .description("Converts a BLG bundle into files and folders compatible with  the Babouk data structure.")
  .action(async (root, sphereId) => {
    console.log(`Importing ${root} into orba '${sphereId}'...`);
    let input = fs.readFileSync(path.join(root, 'data.json'), { encoding: 'utf8' });
    input = input.replace("var blg = ", "");
    const data = JSON.parse(input);
    const guide = data.guide;
    const sphere = resolve(sphereId, undefined, Type.SPHERE);

    try {
      // Create site home page
      let home = null;

      try {
        home = await store.getPage(resolve("accueil", sphere));
        console.log(home);
      } catch (e) {
        home = await store.addPage(resolve('accueil', sphere), AUTHOR, `# Blue Lion Guides\n\n# Blue Lion Guides\n\n`);
      }

      // Create guide page
      const description = guide.shortdescription !== undefined ? guide.shortdescription : "";
      let guidePage = undefined;
      const gContent = `# ${guide.title}\n\n::: hero\n:::\n${description}\n\n`;
      try {
        guidePage = await store.addPage(resolve(guide.title, sphere), AUTHOR, gContent);
      } catch (e) {
        guidePage = await store.addPage(resolve(guide.title, sphere), AUTHOR, gContent, normalize(guide.title) + "-" + getRandomHex(6));
      }
      const guideId = katonoma(guidePage);

      // Copy all guide images as attachments to the guide page
      await copyImages(root, data.images, guidePage.reference);
      // await processGalleries(root, data, guidePage.reference);

      // Process general guide pages and add them to the guide page
      let info = "";
      for (let item of ['authorId', 'aboutId', 'helpId', 'introductionId']) {
        const page = data.pages[guide[item]];
        if (page === undefined) {
          console.log("*** warning: page not found: " + item);
        } else {
          const p = await importPage(root, page, sphere, guideId, data);
          item = item.replace("Id", "");
          info += `* ${capitalize(item)}: [${p.title}](${katonoma(p)})\n`;
        }
      }

      guidePage = await store.getPage(guidePage.reference);
      await store.savePage(guidePage.reference, `${guidePage.body}\n\n${info}`, AUTHOR);

      // Process itineraries
      guidePage = await store.getPage(guidePage.reference);
      await store.savePage(guidePage.reference, `${guidePage.body}\n\n`, AUTHOR);
      let itineraryIds = new Array<string>();
      let guideContent = "::: grid\ncolspans: {mobile: 12, tablet: 6}\nyaml: true\n";
      for (const itinerary of guide.itineraries) {
        let itineraryContent = `# ${itinerary.title}\n\n`;

        // Add tour information, if any
        if (itinerary.tourinfoId !== undefined) {
          let itineraryHero = "::: hero\n"
          let tourInfo = await getBlgPageContent(root, data.pages[itinerary.tourinfoId]);
          //itineraryHero += tourInfo + "\n";

          const tourInfoTitle = data.pages[itinerary.tourinfoId].title;
          let tourInfoPage = undefined;
          const tContent = `# ${tourInfoTitle}\n\n${tourInfo}`;
          try {
            tourInfoPage = await store.addPage(resolve(tourInfoTitle, sphere), AUTHOR, tContent);
          } catch (e) {
            tourInfoPage = await store.addPage(resolve(tourInfoTitle, sphere), AUTHOR, tContent, normalize(tourInfoTitle) + "-" + getRandomHex(6));
          }

          itineraryHero += "info:\n  id: " + katonoma(tourInfoPage) + "\n";
          itineraryHero += ":::\n\n";
          itineraryContent += itineraryHero;
        }

        itineraryContent += "::: grid\ncolspans: {mobile: 12, tablet: 4}\nyaml: true\n";
        for (const point of itinerary.points) {
          if (data.pages[point.pageId] === undefined) {
            console.log("Warning: page not found: ", point.pageId);
            continue;
          }
          const pointPage = await importPage(root, data.pages[point.pageId], sphere, guideId, data);
          if (pointPage !== undefined) {
            // itineraryContent += `* [${pointPage.title}](${katonoma(pointPage)})\n`;
            if (point.tonextstep !== undefined && point.tonextstep.content !== undefined) {
              point.tonextstep.content = await mdize(point.tonextstep.content);
            }
            const topGalleryId = data.pages[point.pageId].topGalleryId;
            let topImage = "";
            if (topGalleryId !== undefined) {
              const gallery = data.galleries[topGalleryId];
              const im = gallery.images[1];
              const topImageObj = data.images[im.imageId];
              topImage = topImageObj.path.substring("images/".length);
            }
            let itineraryObject = {
              label: pointPage.title,
              link: katonoma(pointPage),
              tonextstep: point.tonextstep,
              media: `${topImage}@${katonoma(guidePage)}`
            };
            itineraryContent += "-\n" + yaml.safeDump(itineraryObject);
          }
        }

        itineraryContent += ":::\n\n";

        //let about = "";

        // Add about section to itinerary content
        //itineraryContent += "\n\n" + about;

        // Create itinerary page
        const it = await importPage(root, { title: itinerary.title, content: itineraryContent }, sphere, guideId, data);
        itineraryIds.push(katonoma(it));

        // In the guide page, add a link to the newly created itinerary
        guideContent += "-\nimage: 04d01c315d2064b060541788486646a7453bd6a9.jpg@.settings\n";
        guideContent += "label: \"" + itinerary.title + "\"\n";
        guideContent += "link: " + katonoma(it) + "\n";
      }

      guideContent += ":::\n\n";
      guidePage = await store.getPage(guidePage.reference);
      await store.savePage(guidePage.reference, `${guidePage.body}${guideContent}`, AUTHOR);

      // Process map
      if (guide.map !== undefined) {
        const color = getRandomHex(6);
        const mapId = `map-${color}`;
        const top = guide.map.top, bottom = guide.map.bottom;
        const map = {
          center: [(top[1] + bottom[1]) / 2, (top[0] + bottom[0]) / 2],
          type: "cantemir",
          "geo-relation": ".has-coordinates",
          zoom: 15,
          items: itineraryIds.map((item: string) => { return { id: item } })
        };
        const content = `# ${guide.title} (carte)\n\n::: map\n${yaml.safeDump(map)}n:::\n\n`;
        await store.addPage(resolve(mapId, sphere), AUTHOR, content);
        // In the guide page, add a link to the newly created map
        guidePage = await store.getPage(guidePage.reference);
        await store.savePage(guidePage.reference, `${guidePage.body}* Map: [${mapId}](${mapId})`, AUTHOR);
      }
      // Process plans
      for (let [planId, plan] of Object.entries(data.plans as object)) {
        console.log("Processing plan", planId);
        const newPlanId = `plan-${planId.substring(0, 6)}`;
        let items = new Array<object>();
        plan.markers.forEach((marker: any) => {
          items.push({
            label: marker.title,
            symbol: marker.title,
            position: marker.planPos
          })
        })
        const content = `# ${plan.title}\n\n::: map\n${yaml.safeDump({
          type: "tobler",
          center: [0, 0],
          tiles: `${newPlanId}/media/tiles/{z}/{x}/{y}.png`,
          items: items,
          zoom: plan.minZoom
        })}:::\n\n`;
        const planPage = await store.addPage(sphere, newPlanId, AUTHOR, content);
        // await copyTiles(root, planId, planPage.reference);
        guidePage = await store.getPage(guidePage.reference);
        await store.savePage(guidePage.reference, `${guidePage.body}* Plan: [${plan.title}](${newPlanId})`, AUTHOR);
      }


      // In the home page, add a link to the guide
      home = await store.getPage(resolve("accueil", sphere));
      await store.savePage(home.reference, `${home.body}* [${guidePage.title}](${guideId})`, AUTHOR);

      // Remove all images that are not present in at least one of the imported pages (these are the images coming from Wikipedia)
      const guideDocsFolder = pathify(resolve(MEDIA, guidePage.reference, Type.SERVICE));
      Object.entries(data.images).forEach(async (image: any) => {
        const name = image[1].path.substring("images/".length);
        const results = await traverser.search(sphere, { text: name });
        if (results.length === 0) {
          const imageFileName = path.basename(image[1].path);
          fs.unlinkSync(path.join(guideDocsFolder, imageFileName));
        }
      })


    } catch (e) {
      console.log(e);
    }

  });

command.version("1.0").parse(process.argv);
