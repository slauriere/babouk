<!-- Displays either the commits of an orba, or the ones related to a specific page, or a specific commit information. -->
<template>
  <div class="history">
    <!-- Introductory content / used in Izdubar, in case the content field is not empty. TODO: add key -->
    <div v-if="content.length > 0" class="player" v-html="content"></div>
    <!-- List of commits, in case the commits field is not empty, it consists of one single commit when the page itself is a commit. -->
    <div v-for="(commit, index) in commits" :key="index" class="commit">
      <div class="box">
        <article class="media">
          <div class="media-content">
            <div class="content">
              <!-- the commit date can be undefined in case we're comparing two commits -->
              <h2 v-if="commit.date !== undefined">
                <span class="date"
                  ><a :href="serialize(sylkag(commit))" @click="clicked(commit)" v-on:click.prevent>{{ dateg(commit) }}</a></span
                > ·
                <a class="user" :href="commit.author_name">{{ commit.author_name }}</a>
              </h2>
              <h2 v-else>{{ katonoma(page) }}</h2>
              <ul v-if="commit.eiee != undefined">
                <!-- We're looping over each page that is referenced by this commit. -->
                <li v-for="entry in commit.eiee" :key="`${commit.hash}-${katonoma(entry)}`">
                  <!-- This gives access to the individual file -->
                  <!-- A page label can be undefined in case the Git repository while updated after the server was started and the
                  label incides were built. In that case the page identifier gets displayed. -->
                  <a :href="serialize(entry.reference)" @click="emit('page-open', entry.reference)" v-on:click.prevent>{{ entry.title || katonoma(entry) }}</a>
                </li>
                <!-- Display information if any is stored by the server in the "xabar" field ("message") -->
                <li v-if="commit.xabar !== undefined">
                  <a :href="serialize(sylkag(commit))" @click="clicked(commit)" :title="$t(commit.xabar)" v-on:click.prevent>...</a>
                </li>
              </ul>
              <div v-else-if="commit.patch != undefined">
                <div class="patch" v-html="htmlg(commit.patch)"></div>
                <div v-if="commit.xabar !== undefined">
                  {{ $t(commit.xabar) }}
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import dayjs from "dayjs";
import {Component, Prop, Vue} from "vue-property-decorator";

import * as diff2html from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";

import { Page, katonoma, resolve, Reference, Type, serialize } from "@babouk/model";
import sam from "@babouk/sam";
import zevir from "@babouk/zevir";

import bus from "../../main/bus";

@Component({
  components: {},
})
export default class History extends Vue {
  @Prop({})
  page: Page;

  content: string = "";

  commits: any[] = [];

  service: Reference = resolve(".history", this.$store.state.sphere, Type.SERVICE);

  clicked(commit: any, eie?: Reference): void {
    console.log("clicked", commit);
    bus.$emit("page-open", this.sylkag(commit, eie), true, "history");
  }

  dateg(commit: any): string {
    return dayjs(commit.date).format("MMM D, H:mm");
  }

  emit(eventName: string, ...args: any): void {
    bus.$emit(eventName, ...args);
  }

  htmlg(patch: any): string {
    return diff2html.html(patch, { drawFileList: false, outputFormat: "line-by-line" });
  }

  katonoma(sylka: Reference): string {
    return katonoma(sylka);
  }

  mounted(): void {
    // Retrieve umlando only if the current page has not commit type, that is only if the page is the ".history" root service, or if it is a standard
    // page for which we want to display the history.
    console.log("page", this.page);
    if (this.page.reference.type !== Type.COMMIT) {
      let target = this.page.reference;

      // In case of special page '.history', get the orba history, possibly prefixed by some content in the case of izdubar,
      // otherwise get the log of the current page
      if (katonoma(this.page) === ".history") {
        // The target reference is the orba
        target = resolve(katonoma(this.$store.state.sphere), undefined, Type.SPHERE);
        if (katonoma(this.$store.state.sphere) === "izdubar") {
          sam.getPage(resolve(".ngutu", target)).then((e: Page) => {
            zevir.htmlize(e.body).then((output: any) => {
              this.content = output;
            });
          });
        }
      }

      sam.history(target).then((data: any) => {
        data.forEach((commit: any) => {
          //if (commit.diff != undefined && commit.diff.patch != undefined) {
          this.commits.push(commit);
          //}
        });
      });
    } else {
      // This page is a commit -> we push it as a single element of the commit array
      this.commits.push(this.page.body[0]);
    }
  }

  // the optional eie argument is for obtaining the reference of a specific file in a given commit (not used at the moment)
  sylkag(commit: any, eie?: Reference): Reference {
    // The commit hash can be undefined in case we're displaying a comparison between two commits
    if (commit.hash === undefined) return this.page.reference;
    let sylka = resolve(commit.hash, this.service, Type.COMMIT);
    if (eie !== undefined) {
      sylka = resolve(katonoma(eie), sylka);
    }
    return sylka;
  }

  serialize(sylka: Reference): string {
    return serialize(sylka);
  }
}
</script>
