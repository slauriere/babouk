# Model

+ Rename reference to URI or to Identifier? use https://github.com/garycourt/uri-js

  Identifier (from top to bottom):
    sphere (=host) -> string
    type: page, media, commit, ring
    name
    language (only for pages or media)
    page: (=first segment of path)

+ rename "label" to "title"?
+ urlize -> serialize see https://github.com/garycourt/uri-js
- Handle case where page label contains slashes -> they have to be encoded by model.urize
- Check difference between != null and !== null (see for example issue in store.ts addRing )
- In model, differentiate between the "rings" service and the "ring" type, idem with "media"
- Rename ".history" into ".log"?
- Find name for model module / inspired from philosophy or art. Menon ? Simmias ? 
- Rename model.type to model.types for code clarity and using 'type' in function arguments?
- In view class, shouldn't the template be a reference rather than a string?
- Should we have on the one side ring containing only references, and ring containing real objects
- We should be able to reference: a page (-> its folder, a page content file (-> its tav file), etc, its available translations etc.
- See if "saved" should be at the page level or at the view level, since one page can be in several view, but when it's saved it's saved for all.
- Introduce equals to compare instances: however on client size we deal with "fake" instances: they are built from json only, they are not real objects.
- Renaming
  - Implement an id renamer
- Fill in a YAML file containing all main entities definition
- See where we store the fact that a page is editable for a given user: in the page itself or in a distinct object and call, or a wrapper

## Graph API

- Graph API
- Should "ring" get renamed to "edge" for clarity?
