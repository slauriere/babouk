# Ub

Twitter tags in addition to og tags, e.g. https://lukeed.com/

simplify traverser / store dependencies, the traverser should not access the file system directly

## API

- https://petstore.swagger.io/
- Look into VuePress and Strapi doc https://strapi.io/documentation/v3.x/
- See also the VuePress markup ::: tabs / ::: tab etc.
- https://github.com/pgroot/express-swagger-generator

## Various

- editable -> writable
- only the administrator should be allowed to save the settings
- issue with role registration: log in as "blg", logout, log in as "slauriere" -> error "role not found" and no possibility to log out since blank screen
- languages: it could be that there is no "default" language: a guide can be created first either in English or in Italian or any other language -> in that case, there is no "body.md", there are only "body.it.md", "body.en.md", etc. In other circumstances, there can be various "body.md" in various languages (eg in a personal wiki where the language does not necessarily matter, while being multilingual).
- pathify: see if we can avoid passing BODY, METADATA as parameters for pages (since we implicitely want the body)
- Use Git hooks to save metadata
+ the main stylesheet should be added directly to the <head> by the server, not from the client as it adds some delay
- settings: rename "cerbero" to access, permissions, ...
+ Consider grouping the getRings query: ["~contains", "*"], ["contains", "poi", "index"], ["has-cover"]
- Add media and rings to Git automatically
- Move .iiakunti to .users or something similar: .users, .accounts, .profiles...
- https://stackoverflow.com/questions/630453/put-vs-post-in-rest
- increase score of uris
- when indexing doc:  see if we should update doc rather than using "add" when updating it
- split routes into several ones: page, ring, media, ...
- Fix favicon error 400
- Support unlimited number of relations in router.get(["/:pageId/rings/:relation1?/:relation2?"
- Add concept of "computed property", eg: has-cover: first image found
- Home page: present indexable content to search engines / rename "wantsHtml"
- When returning a page: consider returning the title separately from the content itself so as to avoid extracting the title twice (once on the server side for preparing the OGP metadata, once on the client side for extracting the title)
+ media API: should return array of references, just like what the ring API returns (also because a future search endpoint will return references as well)
- check if ".instances" is used
- Page should be indexed even if there is an error with Git while saving, otheriwse it cannot be loaded / deleted from the index (restart needed) (eg when .lock is present in the Git repository)
- Use path.extname for extensions
- Plugin: declare its routes, they get automatically registered in the route API
- When retrieving a page, should we inject the template into it on the server, or get the template from the client?
- Rename .bashara to .config or .skin or .babouk (NB: it configures both the client and the server)
- When a stylus attachment changes, fire a Stylus transformation into CSS automatically, see https://github.com/lukeed/watchlist
- Home page: see how to display title or not
- When creating a new ring programmatically it should be more clear the reference can be empty since it has no real reference yet.
- Consider adding an option for overwriting an existing page when creating it (sam.pagen)
- Initialize the .gitignore file from archiver.ts if not existing already
- When the tav first line is not a title, probably not a good idea to use the full line as label
- Issue when bashara yaml is invalid: it cannot get updated anymore
- See how to have a map whose keys are objects (use the equals function?)
- See what we do with relation "est-nomme(e)-en-reference-a" in ruesacalie
- When saving a ring, check that the referent and the relatum are compatible with the relation's domain and image before saving
- Introduce namespace and add documentation, e.g. see git-js promise.d.ts

- Worker threads when indexing a page on save: https://blog.logrocket.com/node-js-multithreading-what-are-worker-threads-and-why-do-they-matter-48ab102f8b10/
- Consider integration with Zettlr?
- Read more code

## Remarks

- Using references rather than strings is important because we could for instance edit other objects than pages in the editor (eg attachment text files).
- Support for "prototypes": create POI -> all relevant rings are already present

## Sam

- Simplify getRings() by turning it to getRings(referent, options)
  getRings(referent: page | string | reference, relations?: string | reference | string[] | reference[], relatum?: string, types?: string[], sortBy
  -> getRings(referent, {via: relations, relata: , types, sort: })
- Use strings instead of references? (issue with window.xxx)
- Can be used either via new sam(sphereId).getRings(pageId, ...) (command line) or via the browser: sam.getRings(pageId) et dans ce cas comme le sphereId est undefined, il est récupéré depuis le store (mais comment accéder au store depuis une lib distincte). Ou bien plutôt: un mixin qui inject le sphereId dynamiquement?
- Consider adding sam.isA(page, type) to ease checking that a given page has a given type


## REST API

- Media: default: don't return files starting with dot, add option for returning them as well
- /.random should redirect to the computed random page when issued from browser, only JSON when issued from command line or program, unless the redirection should rather be handled on the client side? (yes probably)
- Add function for creating a new sphere by copying core data structures from a YAML file defined in abok (see abok.yaml)

## Archiver

- When saving a page that was actually not added to git yet, it does not work but there is no error thrown nor feedback given
- Add / remove media and rings to git
- Git log performance
- Git repository initialization: what if the repository was not initliazed -> fire error
- Make sure that the .gitignore of each web contains "token" so that the user encrypted key is not stored
- Before performing a commit, make sure the file was adedd to Git, otherwise this fires an uncaught error or infinite loop or missed commit

## Auth and ACL

- Issue when the jwt expires : we may need to have the max-age on the client side so that once it has expired, it gets deleted and is not sent anymore, but this is only a workaround. Issue: 1) signin is called, 2) in parallel just after, .bashara is called and receives a 403 -> no home page is displayed. 
- Signin / signup: use superclass for common fields
- Restrict access to umlando, otherwise it gives access to each ressource. Or possible control each modified ressource.
- User is logged, server relaunched -> issue because the "grant" calls are executed upon login, so a re-login must be called so that rights are granted
- Handle the case when the token expires
- Cerberom: instead of sending "unauthorized", redirect to home page with a redirect parameter in URL for redirecting to resource once logged? See what's the canonical way to handle this.
- Read access control: filter search results by access right
- Media: protect access to the user ".key" file
- One guard per sphere: security issue
- Option to disable sign-up (calao, babouk etc)
- Make sure that the keys of the users are not committed to the repository (but are backed up) (file "key.txt") - rename it to something that is less likely to get used such as "token"

## Domains

- Ability to handle multiple subdomain names, eg wiki.calao.nu and wiki.babouk.net
- Consider having two modes for the spheres: domain based and path based. For now only the domain based mode is supported.

## Infrastructure

- Tests
- Continuous integration
- Continuous deployment
- Logging

## Pixier

- Issue with thumbnails when images have a space in their name

## Search

- Abstract search in order to have several possible implementations
- Type of the rings index should be something like Map<string, ring[]>
- Pagination for search and other endpoints etc (see which ones exactly)
    pagination
      gauge: 100 (gauge in azeri)
      cursor: 101 (cursor in azeri)
    slice
      data: any[]
      total: 483 (total in azeri)
      pagination: gauge: 100, cursor: 101
    add parameter to functions for passing kursor, kalibr. (if undefined or kalibr = -1, then send whole data)
- In traverser: we may need to add a parameter to retrieve only direct rings optionally
- Add a repo sanitizer: identifies the rings having no relation and sets a default one, ...
- Experiment with Minisearch
- Use FlexSearch or any other underlying search for indexing the rings rather than home made map
- Index page modification date (and update the date when a ring is added or removed): either with flexsearch structured index, or with a dedicated index
- Supports of accents in search (eg "reference" -> "référence")


## SEO and OGP

- Open Graph Protocol
- Add page content to page for search engine indexing

## Spheres

- Restrict access to calaoa in view mode

## M

- Plugin architecture for Node and Vue
- Is it good practice to use the same endoint for html and json and to adapt response depending on request headers? (eg. issue with duplicate tab)
- Test framework for client and for server?
- Observable: comparison with dependency management with Vue reactive properties maintaining their own properties

## Autocomplete

https://stackoverrun.com/fr/q/5251277
https://stackoverflow.com/questions/11861668/codemirror-remote-autcompletion
