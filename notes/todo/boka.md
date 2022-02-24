# Boka

- NB: there are two ways to open a dialog with parameters: either via commit("dialog", {id: dialogId, + key/value pairs}) or by emitting an event: bus.emit("open-dialog", dialogId, + parameters) -> we may want to have only one manner to avoid confusion, see how it is handled with Android intents

- issue when several slideshows in grid, eg ux-and-design-links
- check naming for macros "slides", "slide". Should it be "slideshow", "slide"
- check semantic difference between "locale" and "language"
- add function that combines urize(localize(reference)) (producing "mamoiada-mask-museum:fr") localurize?
- menu items in second level are not correctly marked as active when selected
- model: this does not really make sense to use katonoma on a view, use katonoma(view.page) instead
+ add favicon (transparent for now?)
- use @iconify/iconify?
- use SVG sprite?
- the share button should show up even when to caption title
- slideshow 'except' -> 'exclude' (see also Git, Rsync, ...)
- consider using display: grid
- consider using logrocket.com for logging
+ add trash view: add macro "::: trash" in page ".trash"
+ add settings view: add macro "::: settings" in page ".settings"
+ ability to edit a media text file in a dialog box
- see if there's a way to use relative uris for media, eg in settings: logo: xxx.jpg instead of logo: xxx.jpg@.settings
+ ring editor : inverse relations
+ issue when label collides but different identifiers (eg "Scene" collides with "Scene template" while "scene" as an id is available)
- SVG font 
 https://css-tricks.com/a-font-like-svg-icon-system-for-vue/
 https://medium.com/js-dojo/making-svg-icon-component-in-vue-cb7fac70e758
 https://github.com/MMF-FE/svgicon
+ normalize intent names eg in templates: page-open vs open-dialog -> see Android naming scheme. page.open, dialog.open, ring.create, ring.save, etc. Possibly introduce an Enum which can be extended if possible.
+ move event handling to class distinct from index.vue for clarity
- boka/images -> boka/icons?
+ in dialogs.page: this.referent should be a real reference (see in player.vue)
+ maybe find better name than "view" for what represents a visual representation of a page: representation?
- Ability to define a template at the site level, eg for adding a footer to all pages
- Move all volume specific styles to volume-template style?
- Consider creating a dropdown menu component which fires events and all, then use it for the user-menu.vue and for share.vue
- Add logger see also request interceptor in sam
- Ability to unactivate some actions: random, close, ...
- Issue when id last character is "?"
- Issue with rings containing a question mark, see for instance man-is-only-fully-human-when-he-plays, see also "What is life? Erwin Schrödinger
- When uploading a file with the same name as an existing one, there should not be a new file attachment displayed at the top.
- When removing a file from the slideshow, it should be removed from the slideshow itself
- Add audio player, eg https://codepen.io/gregh/pen/OWrjOb

- It might be useless to send the sphere from boka to the server since the request is sent to the original domain, which contains the sphere information already (except if one application can retrieve pages from various spheres)
x Scripting: make it possible in the boka client API to load dynamically a CSS attached as a media
- Issue when saving a page with empty content: the previous content is sent instead of an empty string
- See why when creating a ring, the ring-created event is called multiple times (see in console log eg when doing this from the wizard for a cover image)
- Consider having a superclass so that the mixins are available from all subclasses
- Draggable
- Use "compponent :is" rather than v-runtime-template: see why component injection doesn't work
- When the label is empty: display the id
- Migration notification to https://github.com/se-panfilov/vue-notifications + mini-toastr or vue-toasted
- Use superclasses for the modals
- Home page should load even if there is no bashara
- When switching to edit mode, the content should be fetched again in case it has been updated since when it was loaded
- Lock content when editing (or inform user of possible conflict)
- Add debounce to codemirror view so that the tav gets udpated even if not saved yet (for switching to view mode)
- NB: the instances manipulated in Boka are retrieved as json objects from the server, they are not real class instances with functions etc., they are just plain objects with fields, no functions.
- Load the top first existing relatum existants even before any text is typed (as suggestions), then filter on input text
- The tabs contain possibly "fake" pages: for instance the history view of a sphere, or an individual commit view are not real pages. We need to deal with this, except if we consider everything is an page in the sense of "something", which might be acceptable, since they have a type already: page, sphere, ring, commit, etc.
- When used on the client side, the resolve function orbis reference argument could be computed directly from the environment, without the need to pass it
- Make sure all buttons are also links so that they can be clicked the standard way, and accessible
- The random action should not open any system page
- Remove indirect dependency on esprima since not needed since YAML does not contain functions at this stage
- Introduce global configuration object that can be muted, and available from every vue, storing info about: relation page identifier, etc.
- Introduce a registry of all available "modes" (and rename "mode" to "kikj" (= vue))
- When rendering epub images, let the renderer interpret relative links. Another option would be to convert all relative links to absolute links via markdown-it rules, see https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
- See where to localize error messages: on the server side or on the client side (server sends a status and a message key, and the translation bundle is on the client side, but this may require all bundles to be present)
- Add a "settings" page to configure shortcuts etc
- Check that a standard user cannot create system folders from the interface (starting with the dot)
- Ability to edit text attachments directly via CodeMirror
- Preview page on hover
- Migrate from axios to ky / ky-universal (fetch)
- Add "present" in addition to "view" and "edit" / make the modes extensible

## I18n

- Use YAML instead of JSON for i18n data, and load the data only on demand

## Client infrastructure

- Migrate to vue-cli (based on webpack)
- Check https://github.com/alexjoverm/Vue-Typescript-Starter
- Bulma sass import: see what we need to import exactly
- Migration to Vue 3, use suspend component (eg when rings and media are getting loaded)
- Load components on demand
- See why some gifs and pngs are added on build in the dist folder
- See why boka.js is re-downloaded in some cases (400 received instead of 304 from Firefox, not from Chromium, e.g. from a private session, seems vaguely linked with the file size).
- Tests
  https://github.com/lukeed/uvu
- Several CSS should be loaded on demand only: image gallery, diff2html, ... Possibly also CodeMirror.
- https://vuejs.org/v2/guide/events.html#Key-Modifiers
- Extension management: see vscode mecanism and others

## Mobile

- Mobile: Buttons remain focused / hovered once cliked
- Mobile: issue when pasting a text in a multiselect
- Mobile: modal issue the background covers only part of the screen

## Plugins

- Introduce plugin mechanism
