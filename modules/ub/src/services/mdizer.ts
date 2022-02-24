
// This code is not part of zevir because it increases significantly the size of the lib, which is
// meant to be used both in a browser or on a server. 

"use strict";

import unified from 'unified'
import parse from 'rehype-parse'
import rehype2remark from 'rehype-remark'
import stringify from 'remark-stringify'

const mdizer = unified()
  .use(parse, { emitParseErrors: true })
  .use(rehype2remark)
  .use(stringify)

const mdize = async (html: string): Promise<string> => {
  const vfile = await mdizer.process(html) as any;
  if (vfile !== undefined && vfile.contents !== undefined) {
    return vfile.contents.toString().trim();
  } else {
    return Promise.resolve(html);
  }
}

const mdizeSync = (html: string): string => {
  const vfile = mdizer.processSync(html) as any;
  if (vfile !== undefined && vfile.contents !== undefined) {
    return vfile.contents.toString().trim();
  } else {
    return html;
  }
}

export {
  mdize,
  mdizeSync
}
