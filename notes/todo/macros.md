# Macros

- Use "uri" instead of "reference" for slideshows, cat, etc.?

+ Create function that splits the title and the content for slideshow and others, and replace "removeTitle", using regex
- Image macro: beside supporting "index", add ability to insert image that is attached to current page, via the gallery macro? (since we may want to open the image as such)
+ Mode = view, write, -> player, writer, wizard
+ Grid: "link" should be "page"? (no)
- Use template inheritance for displaying errors in macros?

## Grid

- Support embedded grids / check exact correct syntax
+ Image caption should be retrieved from the media metadata instead of getting retrieved from the page content.
- NB: grid metadata uses "-" as separator rather than "---" because the latter in Markdown represents a header.
- Add href to images in cells

## Slideshow

+ Turn the caption files into markdown, which can itself embed YAML: it's more generic: every structured file is Markdown with optional YAML inside.

Figure metadata as md file:

  ```
  # Laura

  ::: data
  author:
  credits:
  date:
  ::::

  lorem ipsum....
```

It may get mapped to a caption vue component which interprets the content

- Check if it's useful to have inline declarations or not (issue: retrieving the title of each image will require performing a request for each of them, except if we expose a dedicated endpoint which returns the titles of a set of images directly):
  ```
  - reference: xxx@yyy
    description: |-
      # Laura
      ::: data
      author: xxx
      :::
      lorem ipsum...
  ```
- Maybe introduce a caption.vue which displays the figure metadata: title, figure toolbar, metadata, description
- We problaby need fields because the title needs to be shown as such on an itinerary or collection page
- Favour one single mechanism (everything as yaml metadata in a media file) over three (tav + metadata file + inline declaration)
- There may be the need to have both a cover and a HD image
- See how to deal with multilingual descriptions (while some fields might be shared between languages)
- Use cases: several images attached to one page vs one image per page (possibly with cover + HD)


+ there should be options for configuring the slideshow: autoHeight, position etc. so we need something like this, just like for grid:
::: slides
options...
-
- image: 

+ Check if both "title" and "caption" are needed, or only "caption"
- possibly find term that is more logical than "gallery" such as "image-set" so as to allow having various representations?

::: image (does not launch a diaporama)
caption: 
reference:
:::

::: slides
reference: abc@def
caption: xyz
:::

- When removing an image, it should get removed from the gallery itself as well
- Gallery responsive images https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images
- Use the picture tag for targeting multiple devices for an image (also possibly for galleries?)
- Better loader positioning (currently shows up at the top)
- https://codesandbox.io/s/content-carousel-w-lightbox-499co
- Upgrade to Swiper latest
- Issue with zoom on images with greater height than width
- Performance with galleries having more than 150 images
