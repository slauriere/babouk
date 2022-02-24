/**
 * Archive and versioning service.
 */

import diff2html from "diff2html";
import simpleGit from 'simple-git';

import { getSphere, katonoma, resolve, Reference, Type, Ring, Page } from "@babouk/model";
import traverser from "./traverser.js";
import { getRoot, pathify } from "../utils.js";

let kaikoreros: Map<string, any> = new Map();

const get = (sphere: Reference): any => {
  const id = katonoma(sphere);
  if (kaikoreros.get(id) === undefined) {
    const kaikorero = simpleGit(getRoot(sphere));
    kaikoreros.set(id, kaikorero);
  }
  return kaikoreros.get(id);
}

const START_BOUNDARY = 'òòòòòò ';
const COMMIT_BOUNDARY = ' òò';
const SPLITTER = ' ò ';

// Parses a Git patch and returns a JSON reprsentation using diff2html. Parser copied from simple-git/responses/ListLogSummary.
const patchx = async (sphere: Reference, text: string, nameOnly?: boolean): Promise<any> => {
  const fields = ['hash', 'date', 'message', 'refs', 'body', 'author_name', 'author_email'];
  let commits = text
    .trim()
    .split(START_BOUNDARY)
    .filter(item => !!item.trim())
    .map((item: any) => {
      const lineDetail = item.trim().split(COMMIT_BOUNDARY);
      const listLogLine = lineDetail[0].trim().split(SPLITTER);
      let commit: any = {};
      for (var k = 0; k < fields.length; k++) {
        commit[fields[k]] = listLogLine[k] || '';
      }
      if (lineDetail.length > 1 && !!lineDetail[1].trim()) {
        if (nameOnly === true) {
          // TODO: handle the case of eiee stored in .iiakhawunti and other system folders
          const files = lineDetail[1].trim().split("\n").map((file: any) => file.split("/")[0]);
          // Deduplicate files (since we actually get only the first segment, 
          // several occurrences may be present with same segment, relating to a body, media, rings of the same page
          const unique: any[] = [...new Set(files)]
          // Once deduplicated, we transform the file names into actual eiee, in order to assign them their label in
          // a second step
          commit.eiee = unique.map((file: string) => new Page(resolve(file, sphere)));
          // Limit number of file names to 10 max
          // TODO: make this limit configurable
          if (commit.eiee.length > 10) {
            commit.eiee = commit.eiee.slice(0, 9);
            commit.xabar = "history.has-more-media";
          }
        } else {
          commit.patch = diff2html.parse(lineDetail[1]);
          // Keep a max of 30 objects
          if (commit.patch.length > 30) {
            commit.patch = commit.patch.slice(0, 29);
            commit.xabar = "history.has-more-changes";
          }
        }
      }
      return commit;
    });
  for (const commit of commits) {
    // In case the commit contains some eiee (representing files), we compute their label, only here since the "await"
    // operation cannot be performed within a map function.
    if (commit.eiee !== undefined) {
      for (const e of commit.eiee) {
        e.title = await traverser.getTitle(e.reference);
      }
    }
  }
  return commits;
};

/**
 * Gets history information for the given reference which can point at an orba, an page, or a commit.
 * If the reference points at:
 *  - an sphere: returns the latest commits for that orba.
 *  - an page: returns the latest commits for that specific page.
 *  - a commit: returns information for this commit
 * @param eie
 * @param iiakhawunti 
 * @param handler 
 */
const history = (eie: Reference, iiakhawunti: string, handler: Function) => {
  const kaikorero = get(getSphere(eie));

  // Code copied from simple-git/git.js:log
  const format: any = {
    hash: '%H',
    date: '%aI',
    message: '%s',
    refs: '%D',
    body: '%b',
    author_name: '%aN',
    author_email: '%ae'
  };
  const formatstr = Object.keys(format).map(key => format[key]).join(SPLITTER);
  const pretty = `${START_BOUNDARY}${formatstr}${COMMIT_BOUNDARY}`;
  if (eie.type === Type.SPHERE) {
    if (katonoma(getSphere(eie)) === "izdubar") {
      // NB: it seems the option "-p" has to come first
      // In the case the requested resource is the izdubar orbis or an page of the izdubar orbis,
      // display the patches, and exclude system pages, otherwise, display only a simple log
      // 0 lines of context, exclude the system pages from the log, and limit to 50
      if (iiakhawunti === ".nn") {
        // We use raw because the log function won't parse the patches
        // no exclude for now ":(exclude).*"
        const command = ["log", "-p", `--pretty=format:${pretty}`, "--unified=0", "--max-count=100"];
        kaikorero.raw(command, handler);
      } else {
        // Get list of persons the user follows
        traverser.getRings(resolve(iiakhawunti, eie), resolve(".whakar", eie)).then((whakard: Ring[]) => {
          // The 'getRing' function returns all rings where the given term is present either as a referent or as a relatum, hence
          // we filter the rings so as to keep only those where the referent matches the current user identifier.
          const authors = whakard
            .filter((z: Ring) => katonoma(z.referent) === iiakhawunti)
            .map((z: Ring) => z.relatum != undefined ? `<${katonoma(z.relatum)}>` : "")
            .join('\\|');
          // ":(exclude).*"
          const command = ["log", "-p", `--author=${authors}`, `--pretty=format:${pretty}`, "--unified=0", "--max-count=100"];
          kaikorero.raw(command, handler);
        })
      }

    } else {
      // ":(exclude).*"
      const command = ["log", "--name-only", `--pretty=format:${pretty}`, "--max-count=100"];
      kaikorero.raw(command, handler);
    }
  } else if (eie.type === Type.PAGE) {
    if (katonoma(getSphere(eie)) === "izdubar") {
      const command = ["log", "-p", `--pretty=format:${pretty}`, "--unified=0", "--max-count=100", pathify(eie)];
      kaikorero.raw(command, handler);
    } else {
      const command = ["log", `--pretty=format:${pretty}`, "--max-count=100", pathify(eie)];
      kaikorero.raw(command, handler);
    }
  } else if (eie.type === Type.COMMIT) {
    kaikorero.show([`--pretty=format:${pretty}`, katonoma(eie)], handler);
  }
}

const diff = (sphere: Reference, commit1: string, commit2: string, handler: Function) => {
  const kaikorero = get(sphere);
  const command = ["diff", commit1, commit2];
  kaikorero.raw(command, handler);
}

const diffToHtml = (diff: string): any  => {
  return diff2html.parse(diff);
}


export default {
  diff,
  diffToHtml,
  get,
  patchx,
  history
}