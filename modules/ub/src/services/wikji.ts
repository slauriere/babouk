"use strict";

import wikijs from 'wikijs';

const wikipedia = (wikijs as any).default({ apiUrl: 'https://fr.wikipedia.org/w/api.php' });

const getAliases = async (page: string) => {
    return wikipedia.page(page).then((pageData: any) => {
        let aliases: string[] = [];
        aliases.push(page);
        return pageData.fullInfo().then((info: any) => {
            if (info.general.nom != undefined && aliases.indexOf(info.general.nom) < 0) {
                aliases.push(info.general.nom);
            }
            if (info.general.nomComplet != undefined && aliases.indexOf(info.general.nomComplet) < 0) {
                aliases.push(info.general.nomComplet);
            }
            return aliases;
        });
    })
    // /.catch(error => {
    //     return [];
    // });
}

const getLinks = async (label: string) => {
    return wikipedia.page(label)
        .then((pageData: any) => {
            return pageData.links().then((links: any) => {
                let lowerCaseLinks: any[] = [];
                links.forEach((item: string) => {
                    lowerCaseLinks.push(item.toLowerCase());
                });
                return { label: label, title: pageData.raw.title, url: pageData.raw.fullurl, links: lowerCaseLinks };
            });
        })

    // .catch(error => {
    //     return { label: label, links: [] };
    // });
}

const lookup = async (page1: string, page2: string) => {
    return getLinks(page1).then(page1Metadata => {
        return getAliases(page2).then(aliases => {
            let flag = false;
            aliases.forEach((alias: string) => {
                if (page1Metadata.links && page1Metadata.links.indexOf(alias.toLowerCase()) >= 0) {
                    flag = true;
                };
            });
            return { wikji: [page1Metadata.label, page1Metadata.title, page1Metadata.url, page2], path: flag };
        });
    })
}

const wikjid = async (labels: any) => {
    if (!labels || labels.length < 2) {
        return [];
    }
    let jobs = [];
    for (let i = 0; i < labels.length - 1; i++) {
        jobs.push(lookup(labels[i], labels[i + 1]));
    }
    return Promise.all(jobs);
}

export default { wikjid }

