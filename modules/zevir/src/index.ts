"use strict";

import dot from "dot";

import markdown from 'remark-parse';
import remark2rehype from 'remark-rehype';
import stringify from 'rehype-stringify';
import unified from 'unified';
import containers from 'remark-containers';
import breaks from 'remark-breaks';
import variables from 'remark-variables';
// import math from 'remark-math';
// import katex from 'rehype-katex';

import unwrapImages from "remark-unwrap-images";

dot.templateSettings.strip = false;

const transformMacro = (node: any, config: any, tokenize: any, attributize: any) => {
  // This is to indicate to the Markdown to HTML converter that whitespaces should be kept in these blocks (since it's YAML).
  node.children[0].type = 'code';
  attributize(config, node);
}

const htmlizer = unified()
  .use(markdown)
  .use(containers, {
    default: true,
    custom: [
      {
        type: 'button',
        element: 'xbutton',
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'cat',
        element: 'cat',
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'style',
        element: 'xstyle',
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'slides',
        element: 'slides',
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'grid',
        element: 'grid',
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'slide',
        element: 'slide',
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'jxta',
        element: 'jxta',
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'map',
        element: 'xmap', // for Vue not liking elements which clash with HTML element names
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'rings',
        element: 'rings',
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'script',
        element: 'script',
        noparse: true,
        transform: transformMacro
      },
      {
        type: 'signin',
        element: 'signin',
        noparse: true,
        transform: transformMacro
      }
    ]
  })
  .use(breaks)
  .use(unwrapImages)
  //.use(math)
  .use(remark2rehype)
  //.use(katex)
  .use(stringify)
  .use(variables, ['{[', ']}']);

// const interpreter = unified()
//   .use(remarkParse)
//   .use(remark2rehype)
//   .use(stringify)
//   .use(variables, ['{[', ']}']);

const interpret = async (text: string): Promise<any> => {
  // TODO: we would like to transform markdown without turning it to HTML yet, but
  // not adding '.use(remark2rehype)' triggers an error.
  // const scripts = text.match(/::: script.+?(?=:::):::/gs); This is the ES2018 version where the dotAll configuration exists
  const scripts = text.match(/::: script[\s\S]+?(?=:::):::/g); // \s\S is a workaround for the lack of dotAll option in ES2016. It uses a character class (e.g. \s) and its negation (\S) together, see https://stackoverflow.com/questions/1068280/javascript-regex-multiline-flag-doesnt-work

  let jobs = new Map();
  scripts?.forEach((script: string) => {
    const assignments = script.split("\n")
    assignments.forEach((assignment: string, index: number) => {
      if (index > 0) { // skip first line which is the "::: script" declaration
        const i = assignment.indexOf("=");
        if (i > 0) {
          const variable = assignment.substring(0, i).trim();
          const command = assignment.substring(i + 1);
          const promise = eval(command);
          jobs.set(variable, promise);
        }
      }
    });

  })

  // Remove the "script" blocks now that they have been parsed and stored for execution
  // TODO: see if the scripts can be extracted and removed at once instead
  // text = text.replace(/::: script.+?(?=:::):::/gs, ""); Commented because ES2018 only
  text = text.replace(/::: script[\s\S]+?(?=:::):::/g, "");

  let keys = Array.from(jobs.keys());
  const resolved = await Promise.all(jobs.values());
  let variables: any = {};
  const processor = htmlizer();
  // The returned values are in the same order, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
  resolved.forEach((result: any, index: number) => {
    console.log("result", result, keys[index]);
    variables[keys[index]] = result;
    processor.data(keys[index], result);
  });

  const template = dot.template(text);
  let body = template(variables);
  body = await processor.process(body);
  return body;
}

const htmlize = async (text: string, data?: any): Promise<string> => {
  const body = await interpret(text);
  if (body !== undefined && body.contents !== undefined) {
    return body.contents.toString();
  } else {
    return text;
  }
}

// TODO: should be same as htmlize (i.e. add call to "interpret")
const htmlizeSync = (text: string): string => {
  const processor = htmlizer();
  const template = dot.template(text);
  let body = template({});
  const vfile = processor.processSync(body);
  if (vfile !== undefined && vfile.contents !== undefined)
    return vfile.contents.toString().trim();
  else
    return text;
}

export default {
  htmlize,
  htmlizeSync,
  interpret
}
