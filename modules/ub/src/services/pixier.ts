
import path from "path";

import fs from "fs-extra";
import sharp from "sharp";

import { katonoma, resolve, Type } from "@babouk/model";

import { getThumbnailPath } from "../utils.js";
import traverser from "./traverser.js";
import store from "./store.js";

const extensions = [".gif", ".jpg", ".jpeg", ".png", ".tiff"];

const getToResize = async (files: string | string[], minWidth: Number = 150): Promise<string[]> => {
  if (!Array.isArray(files)) {
    files = [files];
  }
  let promises = files.map((file: any) => {
    if (isImage(file)) {
      return sharp(file).metadata();
    } else return Promise.resolve();
  });
  let toResize = new Array<string>();
  try {
    (await Promise.all(promises)).forEach((item: any, index: number) => {
      if (item !== undefined && item.width > minWidth) {
        toResize.push(files[index]);
      }
    });
  } catch (err) {
    // TODO: log error and handle it
    console.log("err", err);
  }
  return toResize;
}

const isImage = (file: string): boolean => {
  const fileExtension = path.extname(file.toLowerCase());
  return extensions.some(extension => extension === fileExtension);
}

const resize = async (input: any, output: string, width: Number = 150, format: string = "png"): Promise<any> => {
  const image = sharp(input);
  fs.ensureDirSync(path.dirname(output));
  return image.resize({ width: width })
    .toFormat(format)
    .toFile(output);
}

const resizeAll = async (sphereId: string) => {
  const sphere = resolve(sphereId, undefined, Type.SPHERE);
  const pages = await traverser.getPageIndex(sphere);
  for (const p of pages) {
    const files = await store.getMedia(p.reference, true);
    const toResize = await getToResize(files);
    console.log("- " + katonoma(p));
    if (toResize.length > 0) {
      let counter = 0;
      for (const file of toResize) {
        const ref = resolve(path.basename(file), p.reference, Type.MEDIA);
        const target = getThumbnailPath(ref);
        if (counter === 0) {
          fs.emptyDirSync(path.dirname(target));
        }
        counter++;
        console.log("    - " + path.basename(file));
        // TODO: factorize
        await resize(file, target);
      }
    }
  }
}

export default {
  getToResize,
  isImage,
  resize,
  resizeAll
}
