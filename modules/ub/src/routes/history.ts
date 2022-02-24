import express from 'express';

import { getBoka } from "../utils.js";
import { katonoma, Page, resolve, Type } from "@babouk/model";

import archiver from "../services/archiver.js";
import utils from "./utils.js";
import { error } from "../error.js";

const router = express.Router();

// get history
router.get("/.history", (req, res) => {
  if (utils.wantsHtml(req, res) || utils.isBot(req)) {
    getBoka(resolve(".history", req.sphere, Type.SERVICE))
      .then(boka => res.send(boka))
      .catch((err: Error) => error(err, res, req.query));;
  } else {
    archiver.history(req.sphere, req.login, (err: any, log: any) => {
      //console.log(".history", log);
      if (err == null && log != undefined) {
        let nameOnly = true;
        // In the case of izdubar, we don't want to retrieve only the file names, but the whole diff for each commit
        if (katonoma(req.sphere) === "izdubar") nameOnly = false;
        try {
          archiver.patchx(req.sphere, log, nameOnly).then(commits => res.send(commits));
        } catch (e) {
          error(new Error(e), res, req.query);
        }
      } else {
        error(new Error(err), res, req.query);
      }
    });
  }
});

router.get("/.history/:commitId", (req, res) => {
  // Either send html or json depending on the headers
  if (utils.wantsHtml(req, res) || utils.isBot(req)) {
    getBoka(req.sphere)
      .then(boka => {
        res.send(boka);
      })
      .catch((err: Error) => error(err, res, req.query));;
  } else {
    const history = resolve(".history", req.sphere, Type.SERVICE);
    const reference = resolve(req.params.commitId, history, Type.COMMIT);
    archiver.history(reference, req.login, (err: any, data: any) => {
      if (err == null) {
        archiver.patchx(req.sphere, data).then(patch => {
          // We make sure to send an page because we want to handle the responses as homogenously as possible, by considering
          // that a given commit is like an page: it has a sylka and its body contains the actual structured patch (while for the 
          // traditional eiee, it contains some unstructured text).
          res.send(new Page(reference, katonoma(reference), patch));
        })
      } else {
        error(new Error(err), res, { commit: req.params.commitId });
      }
    });
  }
});

router.get("/.history/:commit1/:commit2", (req, res) => {
  if (utils.wantsHtml(req, res) || utils.isBot(req)) {
    getBoka(req.sphere)
      .then(boka => res.send(boka))
      .catch((err: Error) => error(err, res, req.query));;
  } else {
    archiver.diff(req.sphere, req.params.commit1, req.params.commit2, (err: any, log: any) => {
      if (err == null && log != undefined) {
        const diff = archiver.diffToHtml(log);
        //res.send({ patch: diff });
        const history = resolve(".history", req.sphere, Type.SERVICE);
        const reference = resolve(req.params.commit2 + " - " + req.params.commit2, history, Type.COMMIT);
        res.send(new Page(reference, katonoma(reference), [{ patch: diff }]));
      } else {
        error(new Error(err), res, req.params);
      }
    });
  }
});

export {
  router
};
