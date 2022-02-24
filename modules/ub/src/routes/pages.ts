/**
 *  @openapi
 *  components:
 *    schemas:
 *      Reference:
 *        type: object
 *        description: A Reference is an object allowing to identify uniquely a resource. It can be compared to an URI, and can be serialized into a URI.
 *        required:
 *          - name
 *        properties:
 *          name:
 *            type: string
 *            description: Reference name
 *          type:
 *            type: string
 *            enum: [sphere, page, media, ring, commit]
 *            description: "Reference type (see enum value)"
 *          set:
 *            type: Reference
 *            description: Reference of the set (i.e. the parent) the reference belongs (for instance a page belongs to a sphere, a media and a ring belong to a page, etc.)
 *          language:
 *            type: string
 *            description: Language of the referenced entity
 *      Page:
 *        type: object
 *        required:
 *          - reference
 *        properties:
 *          reference:
 *            type: Reference
 *            description: Page reference
 *          title:
 *            type: string
 *            description: Page title
 *          body:
 *            type: string
 *            description: Page content in Markdown
 *          writable:
 *            type: boolean
 *            description: Indicates whether the user who retrieved the page can update it
 *        example:
 *          reference: 
 *            name: finnegans-wake
 *            type: page
 *            language: default
 *            set:
 *              name: jamesjoyce.wiki
 *              type: sphere
 *          title: Finnegans Wake
 *          body: >
 *            Finnegans Wake is a book by Irish writer James Joyce. It has been called "a work of fiction which combines a body of fables... with the work of analysis and deconstruction".
 *          writable: true
 *      Relation:
 *        description: "The Relation type inherits from Page type. A relation represents a binary link either between two pages, such as 'has author', or between one page and a scalar value, such as 'has coordinates'"
 *        type: object
 *        allOf:
 *          - $ref: '#/components/schemas/Page'
 *        properties:
 *          domain: 
 *            type: string
 *            description: List of page types this relation can be applied to
 *          image: 
 *            type: string
 *            description: List of page types this relation can point at
 *        example:
 *          reference: 
 *            name: has-author
 *            type: page
 *            language: default
 *            set:
 *              name: jamesjoyce.wiki
 *              type: sphere
 *          title: Has author
 *          domain: book|drawing
 *          image: person
 *          body: "Authorship relation"
 *      Ring:
 *        description: "A ring is a statement binding a page (referent), a relation, and another page (relatum) or a value. Example: 'finnegans-wake has-author james-joyce'. A ring can have properties, describing further the statement (eg. 'publication-date: 1848')."
 *        type: object
 *        required:
 *          - reference
 *        properties:
 *          reference:
 *            type: Reference
 *            description: Ring reference
 *          referent:
 *            type: Page
 *            description: Ring referent
 *          relation:
 *            type: Page
 *            description: Ring relation
 *          relatum:
 *            type: Page
 *            description: Ring relatum (a ring contains either a relatum or a value, not both)
 *          value:
 *            type: string|date|number
 *            description: Ring value
 *          properties:
 *            type: object
 *            description: Ring properties
 *        example:
 *          reference: 
 *            name: 4f134c60-92d4-4974-ad10-c1310d970d13
 *            type: ring
 *            set:
 *              name: finnegans-wake
 *              type: page
 *          referent:
 *            reference:
 *              name: finnegans-wake
 *          relation:
 *            reference:
 *              name: has-author
 *          relatum:
 *            reference:
 *              name: james-joyce
 *  
 *  @openapi
 *  tags:
 *    name: Pages
 *    description: API to manage pages
 *
 *  @openapi
 *  tags:
 *    name: Media
 *    description: API to manage page media
 *
 *  @openapi
 *  tags:
 *    name: Rings
 *    description: API to manage page rings
 *
 */

import express, { Request } from 'express';

import fs from "fs-extra";
import multer from "multer";
import path from "path";

import { Page, resolve, resolveSet, Type } from "@babouk/model";

import bok from "../services/bok.js";
import { getBoka, getBokaDir, getThumbnailPath, normalize, pathify, dirname } from "../utils.js";
import utils from "./utils.js";
import pixier from '../services/pixier.js';

import archiver from "../services/archiver.js";
import { error } from "../error.js";

import store from "../services/store.js";
import traverser from "../services/traverser.js";

const jsonParser = express.json({ limit: "1mb" });

// This is because of initialization error when importing 'sys' from ../utils.js "ReferenceError: Cannot access 'sys' before initialization"
const sys = {
  iiakhawunti: ".iiakhawunti",
  git: ".git",
  trash: ".trash"
};

// TODO: find a way to be notified of each file addition, so that plugins (such as vignette generation) are called 
// even if the files are not added via Express.
// TODO: move this to store.addMedia
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    // TODO: move this to sam.getMediaDir(sphere, uri) because it can be used as an API
    const mediaPath = pathify(resolve(file.originalname, utils.getPageReference(req), Type.MEDIA));
    const folder = dirname(mediaPath);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    callback(null, folder);
  },
  filename: (req: Request, file, callback) => {
    const extension = path.extname(file.originalname);
    const name = path.basename(file.originalname.trim(), extension);
    // In case the file is a YAML caption for an image, it has "double extensions": image.jpg.yaml, which is kept so that the caption file has the same name as the image it refers to, just with a YAML extension in addition.
    let normalized = normalize(name, false)
    if (extension !== undefined)
      normalized += extension.toLowerCase()
    callback(null, normalized);
  }
});

const mediaReceiver = multer({
  storage: storage,
  limits: {
    files: 100,
    fieldSize: 500 * 1024 * 1024
  }
});

const uploader = mediaReceiver.array("media");

// TODO: add authenticator
const router = express.Router();

// router.use(routes.sphereExtractor);
// router.use(cerberos.cerberom);

/**
 *  @openapi
 *  /{page-id}:
 *    get:
 *      summary: Gets a page by id
 *      tags: [Pages]
 *      parameters:
 *        - in: path
 *          name: page-id
 *          schema:
 *            type: string
 *          required: true
 *          description: The serialized page reference, e.g. 'finnegans-wake' or 'finnegans-wake:en' in case the page exists in multiple languages
 *      responses:
 *        "200":
 *          description: The corresponding page, if found.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Page'
 *        "404":
 *          description: Page not found.
 */

router.get(["/:uri", `/${sys.iiakhawunti}/:uri`], (req, res) => {
  console.log("wantsHtml", utils.wantsHtml(req, res));
  if (utils.wantsHtml(req, res) || utils.isBot(req)) {
    getBoka(utils.getPageReference(req))
      .then(boka => res.send(boka))
      .catch((err: Error) => error(err, res, req.query));;
  } else {
    store
      .getPage(utils.getPageReference(req), resolve(req.login, req.sphere))
      .then((e: Page) => res.send(e))
      .catch((err: Error) => error(err, res, req.params.uri));
  }
});

/**
 *  @openapi
 *  /{title}:
 *    post:
 *      summary: Creates a new page
 *      tags: [Pages]
 *      parameters:
 *        - in: path
 *          name: title
 *          schema:
 *            type: string
 *          required: true
 *          description: The page title, e.g. 'Finnegans Wake'
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Page'
 *      responses:
 *        "200":
 *          description: The created page
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Page'
 */

router.post(["/:uri"], jsonParser, (req, res) => {
  const referent = utils.getPageReference(req);
  store.addPage(referent, req.login).then((e: Page) => res.send(e)).catch((err: any) => {
    return error(err, res, req.params.uri)
  });
});

/**
 *  @openapi
 *   /{page-id}:
 *     put:
 *       summary: Updates a page
 *       tags: [Pages]
 *       parameters:
 *         - in: path
 *           name: page-id
 *           schema:
 *             type: string
 *           required: true
 *           description: The serialized page reference
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Page'
 *       responses:
 *         "204":
 *           description: Update was successful.
 *         "404":
 *           description: Page not found.
 */

router.put(["/:uri", `/${sys.iiakhawunti}/:uri`], jsonParser, (req, res) => {
  store.savePage(utils.getPageReference(req), req.body.content, req.login)
    .then((result: any) => res.send(result)).catch((err: Error) => {
      return error(err, res, req.params.uri)
    });
});


/**
 *  @openapi
 *  /{page-id}:
 *    delete:
 *      summary: Deletes a page
 *      tags: [Pages]
 *      parameters:
 *        - in: path
 *          name: page-id
 *          schema:
 *            type: string
 *          required: true
 *          description: The serialized page reference
 *      responses:
 *        "204":
 *          description: Delete was successful.
 *        "404":
 *          description: Book not found.
 */
router.delete(["/:uri", `/${sys.iiakhawunti}/:uri`], (req, res) => {
  store
    .erase(utils.getPageReference(req))
    .then((result: any) => res.send(result))
    .catch((err: any) => {
      err.status = 403;
      return error(err, res, req.params.uri)
    });
});

// export as epub
// TODO: externalize as a plugin
router.get("/:uri/.bok", (req, res) => {
  bok
    .druk(resolve(req.params.uri, req.sphere))
    .then((result: any) => {
      res.send(result);
    })
    .catch((err: any) => error(err, res, req.query));
});

/**
 *  @openapi
 *  /{page-id}/media:
 *    get:
 *      summary: Gets page media list
 *      tags: [Media]
 *      parameters:
 *        - in: path
 *          name: page-id
 *          schema:
 *            type: string
 *          required: true
 *          description: The serialized page reference
 *      responses:
 *        "200":
 *          description: The list of media attached to the requested page
 */
router.get(["/:uri/media", `/${sys.iiakhawunti}/:uri/media`], (req, res) => {
  store
    .getMedia(utils.getPageReference(req))
    .then((data: any) => res.send(data))
    .catch((err: any) => error(err, res, req.params.uri));
});

/**
 *  @openapi
 *  /{page-id}/media:
 *    post:
 *      summary: Creates one or several media attached to a page
 *      tags: [Media]
 *      parameters:
 *        - in: path
 *          name: page-id
 *          schema:
 *            type: string
 *          required: true
 *          description: The serialized page reference
 *      responses:
 *        "200":
 *          description: List of created media references
 */
// For media there is no need to have a json body parser, while for other zafus there is, so it's important that this route is declared first.
router.post(["/:uri/media/", `/${sys.iiakhawunti}/:uri/media`], (req, res) => {

  uploader(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      error(err, res);
    } else if (err) {
      // An unknown error occurred when uploading.
      error(err, res);
    } else {
      let confirmation = (req.files as any[]).map(file => {
        return {
          name: file.filename,
          mimetype: file.mimetype,
          size: file.size
        }
      });
      // TODO: turn this into a plugin that listens to file creation events and acts accordingly by creating thumbnails if needed
      // The listener should also remove the thumbnails upon image deletion.
      // Create promise for thumbnail generation and wait until they were generated because they will be needed for the display
      const files = req.files as any[];
      const page = utils.getPageReference(req);
      pixier.getToResize(files.map(file => file.path)).then((toResize: any) => {
        if (toResize.length > 0) {
          // Create folder that will store the thumbnails
          let promises = toResize.map((file: any) => pixier.resize(file, getThumbnailPath(resolve(path.basename(file), page, Type.MEDIA))));
          Promise.all(promises)
            .then(result => {
              res.send(confirmation);
            })
            .catch(err => {
              error(err, res);
            });
        } else {
          // The uploaded files did not consist of any image
          res.send(confirmation);
        }
      });
    }
  });
});

/**
 *  @openapi
 *  /{page-id}/media/{media-id}:
 *    get:
 *      summary: Gets a specific media
 *      tags: [Media]
 *      parameters:
 *        - in: path
 *          name: id
 *          schema:
 *            type: string
 *          required: true
 *          description: The serialized page reference
 *        - in: path
 *          name: name
 *          schema:
 *            type: string
 *          required: true
 *          description: The media name
 *      responses:
 *        "200":
 *          description: The requested media, if found
 */
// TODO: handle error
router.get(["/:uri/media/*", `/${sys.iiakhawunti}/:uri/media/*`], async (req, res) => {
  // TODO: check authorization
  const file: string = req.path.replace(/\/[^/]*\/media\/(.*)/g, "$1");
  let filePath = pathify(resolve(file, utils.getPageReference(req), Type.MEDIA));
  // In case the requested file is an existent thumbnail, send a placeholder
  if (!fs.existsSync(filePath) && file.indexOf(".thumbnails") === 0) {
    console.log("thumbnail", file);
    const boka = getBokaDir();
    filePath = path.join(boka, "icons", "image.svg");
  }
  res.sendFile(filePath);
});

router.delete(["/:uri/media/:mediaId", `/${sys.iiakhawunti}/:uri/media/:mediaId`], (req, res) => {
  const ref = resolve(req.params.mediaId, utils.getPageReference(req), Type.MEDIA);
  store
    .erase(ref)
    .then((result: any) => res.send(result))
    .catch((err: any) => error(err, res, req.params.mediaId));
});

// history
router.get(["/:uri/history", `/${sys.iiakhawunti}/:uri/history`], (req, res) => {
  archiver.history(utils.getPageReference(req), req.login, (err: any, log: any) => {
    if (err == null && log != undefined) {
      archiver.patchx(req.sphere, log).then(commits => res.send(commits));
    } else {
      error(new Error(err), res, req.params.uri);
    }
  });
});

// page relations
router.get("/:uri/relations", (req, res) => {
  traverser
    .getRelations(req.sphere, resolve(req.params.uri, req.sphere))
    .then((entries: Page[]) => res.send(entries))
    .catch((err: Error) => error(err, res, req.query));
});

router.get(["/:uri/rings/:relation1?/:relation2?/:relation3?", `/${sys.iiakhawunti}/:uri/rings/:relation1?/:relation2?`], (req, res) => {
  let relations;
  console.log("relations", req.params.relation1, req.params.relation2, req.query);
  if (req.params.relation1 !== undefined) {
    if (req.params.relation2 !== undefined) {
      if (req.params.relation3 !== undefined) {
        relations = resolveSet([req.params.relation1, req.params.relation2, req.params.relation3], req.sphere);
      } else {
        relations = resolveSet([req.params.relation1, req.params.relation2], req.sphere);
      }
    } else {
      relations = resolve(req.params.relation1, req.sphere);
    }
  }
  const relatum = req.query.relatum !== undefined ? resolve(req.query.relatum as string, req.sphere) : undefined;
  const types = req.query.types !== undefined ? resolveSet(req.query.types as string[], req.sphere) : undefined;
  const squash = req.query.squash !== undefined ? parseInt(req.query.squash as string) : 0;
  console.log("squash", squash, typeof squash);
  traverser.getRings(utils.getPageReference(req), relations, relatum, types, squash, req.query.sort as string, req.query.language as string)
    .then((data: any) => {
      res.send(data)
    })
    .catch((err: any) => error(err, res, req.params.uri));
});

/**
 *  @openapi
 *  /{page-id}/rings:
 *    get:
 *      summary: Gets the list of rings a given page is involved in either as referent or as relatum
 *      tags: [Rings]
 *      parameters:
 *        - in: path
 *          name: page-id
 *          schema:
 *            type: string
 *          required: true
 *          description: The serialized page reference
 *      responses:
 *        "200":
 *          description: The list of rings, if any
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Ring'
 */
router.put(["/:uri/rings", `/${sys.iiakhawunti}/:uri/rings`], jsonParser, (req, res) => {
  // TODO: check authorization
  store
    .saveRing(req.body)
    .then((result: any) => res.send(result))
    .catch((err: any) => error(err, res, req.body));
});

/**
 *  @openapi
 *  /{page-id}/rings/{ring-id}:
 *    get:
 *      summary: Gets a given ring
 *      tags: [Rings]
 *      parameters:
 *        - in: path
 *          name: page-id
 *          schema:
 *            type: string
 *          required: true
 *          description: The serialized page reference
 *      responses:
 *        "200":
 *          description: The requested ring, if any
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Ring'
 */
// TODO: distinguish between rings/ringId and rings/relationId
router.get(["/:uri/rings/:ringId", `/${sys.iiakhawunti}/:uri/rings/:ringId`], (req, res) => {
  const ring = traverser.getRing(resolve(req.params.ringId, utils.getPageReference(req), Type.RING))
  res.send(ring);
});

router.delete(["/:uri/rings/:ringId", `/${sys.iiakhawunti}/:uri/rings/:ringId`], (req, res) => {
  store
    .erase(resolve(req.params.ringId, utils.getPageReference(req), Type.RING))
    .then((result: any) => res.send(result))
    .catch((err: any) => error(err, res, req.params.ringId));
});

// Search within a relation image, possibly refining with the text parameter value
router.get("/:uri/image", (req, res) => {
  // as string needed for some TypeScript configuration since req.query.param returns string | string[] | ParsedQs | ParsedQs[] | undefined
  traverser
    .searchRelatum(req.sphere, resolve(req.params.uri, req.sphere), req.query.text as string)
    .then((entries: Page[]) => res.send(entries))
    .catch((err: Error) => error(err, res, req.query));
});


export {
  router
};
