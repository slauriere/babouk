import express from 'express';

import { Page, resolve } from "@babouk/model";

import { error } from "../error.js";

import store from "../services/store.js";
import traverser from "../services/traverser.js";

const router = express.Router();

// random page
router.get("/.random", (req, res) => {
  store
    .getRandomPage(req.sphere)
    .then((e: Page) => res.send(e))
    .catch((err: Error) => error(err, res, req.query));
});

// get all instances of a given type (the aekum, if any)
// page ".is-a" is already used to represent the relation.
// TODO: we can probably merge all search functions into one big
// TODO: can probably get merged with searchRelatum
router.get("/.instances", (req, res) => {
  traverser
    .getInstances(req.sphere, resolve(req.query.type as string, req.sphere))
    .then((entries: Page[]) => res.send(entries))
    .catch((err: Error) => error(err, res, req.query));
});

/**
 *  @openapi
 *  path:
 *    /.search:
 *      get:
 *        summary: Search pages whose title or body contains the input string
 *        tags: [Search]
 *        parameters:
 *          - name: 'text'
 *            in: 'query'
 *            schema:
 *               type: 'string'
 *        responses:
 *          "200":
 *            description: The list of matching pages
 *            content:
 *              application/json:
 *                schema:
 *                  type: array
 *                  items:
 *                    $ref: '#/components/schemas/Page'
 */

// TODO: since this endpoint actually returns pages, it may be renamed to ".pages", while keeping ".search" for searching not only pages but anything: pages, images, rings, ...
router.get("/.search", (req, res) => {
  traverser
    .search(req.sphere, req.query)
    .then((result: any) => res.send(result))
    .catch((err: Error) => error(err, res, req.query));
});

router.get("/.images", (req, res) => {
  traverser
    .searchImages(req.sphere, req.query)
    .then((result: any) => res.send(result))
    .catch((err: Error) => error(err, res, req.query));
});

export {
  router
};

