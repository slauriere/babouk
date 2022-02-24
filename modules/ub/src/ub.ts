"use strict";
import command from "commander";

import { resolve, Type } from "@babouk/model";
import store from "./services/store.js";
import { renameMedia } from "./utils.js";
import pixier from "./services/pixier.js";
import saa from "./services/saa.js";
import wikipedia from "./services/wikipedia.js";

command
  .command("extract <sphere-id> <page-id> <target-path>")
  .description("Extracts the relata of a page into a new folder")
  .action((sphereId, pageId, targetPath) => {
    console.log("extract:", sphereId, pageId, targetPath);
    store.extractSphere(sphereId, pageId, targetPath).catch(err => {
      console.log(err);
    });
  });

command
  .command("rename-media <folder> <target>")
  .option("-p, --prefix [prefix]", "With specific prefix")
  .description("Rename the files in a page folder")
  .action((folder, target, cmd) => {
    console.log("rename-media:", folder, target, cmd.prefix ? cmd.prefix : undefined);
    renameMedia(folder, target, cmd.prefix ? cmd.prefix : undefined);
  });

command
  .command("rename <sphere-id> <page-id> <new-page-id>")
  .description("Update the identifier of a page")
  .action((sphereId, pageId, newPageId) => {
    console.log("rename:", sphereId, pageId, newPageId);
    store.rename(sphereId, pageId, newPageId).catch((err: any) => {
      console.log(err);
    });
  });

command
  .command("thumbnailize <sphere>")
  .description("Generates or regenerates all thumbnails for a given sphere")
  .action((sphere) => {
    console.log("thumbnails:", sphere);
    pixier.resizeAll(sphere).catch((err: any) => {
      console.log(err);
    });
  });

command
  .command("annotate <named-entities> <input> <saa-jar-path>")
  .description("Annotate text with found named entities")
  .action(async (namedEntities, input, saaJarPath) => {
    const matches = await saa.annotate(input, namedEntities, saaJarPath);
    console.log(matches);
  });

command
  .command("wikipedia <sphere>")
  .description("Download Wikipedia articles of pages having a ring pointing at a Wikipedia article")
  .action(async (sphere) => {
    sphere = resolve(sphere, undefined, Type.SPHERE);
    const rings = await wikipedia.search(sphere, "a-comme-identifiant-wikipedia");
    for (const ring of rings) {
      console.log(ring.referent.reference.name + " - " + ring.value);
      if (ring.value !== undefined) {
        await wikipedia.download(ring.value, ring.referent.reference);
      }
    }

  });

//"/home/slauriere/Babouk/Ideliance/volcans-1.txt"
command
  .command("ideliance <folder-path> <orbis-id>")
  .description("Imports Ideliance data")
  .action((folderPath, orbisId) => {
    // const txt = fs.readFileSync(folderPath).toString();
    // let state: string = "0",
    //   dictionary = {},
    //   counter = 0,
    //   previous = [],
    //   rings = [];
    // for (const x of txt.split("\n")) {
    //   if (x === "<S et V>") {
    //     state = "sv";
    //     continue;
    //   } else if (x === "<les_SVC>") {
    //     state = "svc";
    //     counter = 0;
    //     continue;
    //   } else if (x === "<ORDRE>") state = "ordre";

    //   previous.push(x);

    //   if (state === "sv") {
    //     if (counter % 2 === 1) {
    //       dictionary[previous[0]] = x;
    //       previous = [];
    //     }
    //   } else if (state === "svc") {
    //     if (counter % 4 === 3) {
    //       rings.push(previous);
    //       previous = [];
    //     }
    //   }
    //   counter++;
    // }

    // Create eiee
    // for (const [pageId, pageLabel] of Object.entries(dictionary)) {
    //   sam.addPage(orbisId, pageId).then(() => {
    //     sam.saveTav(orbisId, pageId, `# ${pageLabel}`);
    //   });
    // }

    // Create ring, and mark relations as such
    // let relations = [];
    // for (const ring of ring) {
    //   sam.saveRing(orbisId, ring[0], "ring", {
    //     relation: Ring[2],
    //     relatum: Ring[1]
    //   });
    //   if (!relations.includes(ring[2])) {
    //     relations.push(ring[2]);
    //     sam.saveRing(orbisId, ring[2], "ring", {
    //       relation: ".izu",
    //       relatum: ".aek"
    //     });
    //   }
    // }

    // Add media
    // const imageExtensions = ["bmp", "jpg", "jpeg", "png"];
    // for (const [pageId, pageLabel] of Object.entries(dictionary)) {
    //   const index = pageLabel.lastIndexOf(".");
    //   if (index > 0 && pageLabel.length > index) {
    //     const extension = pageLabel.substr(index + 1).toLowerCase();
    //     if (imageExtensions.includes(extension)) {
    //       const fileName = pageLabel.substr(pageLabel.lastIndexOf("\\") + 1);
    //       const filePath = path.join("/home/slauriere/Babouk/Ideliance/HTML-v3", fileName);
    //       if (fs.existsSync(filePath)) {
    //         const mediaPath = sam.getMediaPath(orbisId, pageId);
    //         fs.mkdirSync(mediaPath);
    //         fs.copyFileSync(filePath, path.join(mediaPath, fileName));
    //       }
    //     }
    //   }
    // }

    // Index relations
  });

command.version("1.0").parse(process.argv);
