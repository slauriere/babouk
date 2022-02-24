import { execute } from "../utils.js";

// convert [[9:13], [45:49], [51:55], [57:61]] to [ {start: 9, end: 13}, ...]
const extractPositions = (positions: string): any[] => {
  positions = positions.substring(1, positions.length - 1);
  const array = positions.split(", ");
  let pos: any = [];
  array.forEach(item => {
    const ar = item.split(":");
    pos.push(parseInt(ar[0].substring(1)));
  })
  return pos;
}

const annotate = async (input: string, entities: string[], saaJarPath: string): Promise<any> => {
  if (input !== undefined && entities !== undefined && Array.isArray(entities)) {
    // remove commas for now since not considered properly by Saa it seems
    input = input.toLowerCase().replace(/,/g, " ").replace(/\.js/g, "js");
    entities = entities.map(item => item.toLowerCase());
    const command = `java -cp ${saaJarPath} saa.Saa "${input}" "${entities.concat(",")}"`;
    const data: any = await execute(command);
    if (data.err == undefined && data.result !== undefined) {
      const entityOccurrences: string[] = data.result.split("\n");
      let annotations: any = {};
      entityOccurrences.forEach(entityOccurrence => {
        const occurrence = entityOccurrence.split(" - ");
        if (occurrence.length == 2) {
          const entityName = occurrence[0] as string;
          const positions = extractPositions(occurrence[1]);
          annotations[entityName] = positions;
        }
      });
      return annotations;
    } else {
      // TODO: throw error instead?
      return data.err;
    }
  } else {
    throw Error("Saas: invalid arguments");
  }
}

// extractNamedEntities("when the music is alpha beta over alpha beta music music music", ["jim morrison", "music", "alpha beta"]).then(data => {
//   console.log(JSON.stringify(data));
// })

export default {
  annotate
}