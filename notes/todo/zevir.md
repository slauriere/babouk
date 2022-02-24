# Zevir

+ https://github.com/remarkjs/remark-external-links
- Ability to add comments in Markdown
- Consider providing a different implementation of remark-containers with simple regex like /::: script.+?(?=:::)/gsm
- Add a context so that each macro can "know" in the context of which page it is getting rendered

- Handle errors more correctly when executing promises
- See what happens with textarea: why can they not be used directly
- Consider injecting doT partials as macros made available in each page? see https://github.com/olado/doT/blob/master/examples/browsersample.html
- Handle errors in partials when the included page is not found
- When a zevir parsing error occurs, print it in the view rather than in the console, eg itinerary template.
- Support nested grids, see also nested containers doc at https://github.com/Nevenall/remark-containers
- See why transformation from table to xtable won't work just like map -> xmap does
+ Unify syntax and processing of grid and thumbnails since both handle image transformations.
- Transform ![title](image@id) to ![title](id/media/image)
- Generate <figure><img src="image"><figcaption>title</figcaption></figure> from ![title](img) (check if title is right or is it alt?)
- Consider using the picture tag for handling various image sizes for various devices
  https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture
  https://github.com/rehypejs/rehype-picture
- Add rehype-slug https://github.com/rehypejs/rehype-slug (but check it does not drag too many dependencies on the client), see also https://github.com/remarkjs/remark-slug

