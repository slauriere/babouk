<template>
  <div class="modal is-active">
    <div @click="close" class="modal-background"></div>
    <div class="modal-card galdera">
      <header class="modal-card-head">
        <p class="modal-card-title">
          <span name="header">{{ title }}</span>
        </p>
        <button @click="close" aria-label="close" class="delete"></button>
      </header>
      <section class="modal-card-body">
        <textarea
          ref="mots"
          v-if="mode == 0"
          name="mots"
          class="textarea"
          placeholder="Saisir un chemin à valider, par exemple : Mozart, Autriche, Europe, France, Football, PSG, Neymar"
          :value="labels"
        ></textarea>
        <div v-if="mode == 1">
          <div class="content" v-html="aide"></div>
        </div>
        <div v-if="mode == 2">
          <div class="content">
            <p>
              Pour signaler des wikjis remarquables par leur proximité, mentionnez
              <a href="https://twitter.com/wikjiji" target="_blank">@Wikji</a> sur Twitter et nous citerons ici les plus étonnants d'entre eux !
            </p>
          </div>

          <div class="box">
            <article class="media">
              <div class="media-content">
                <div class="content">
                  <p>
                    <a href="https://fr.wikipedia.org/wiki/Mano_Solo" target="_blank">Mano Solo</a> –
                    <a href="https://fr.wikipedia.org/wiki/Sophie_de_Condorcet" target="_blank">Sophie de Condorcet</a>
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
        <div v-if="mode == 3">
          <h1>Résultat</h1>
          <div class="box">
            <article class="media">
              <div class="media-content">
                <div class="content">
                  <ul>
                    <li v-for="entry in info" :key="entry.wikji[0]">
                      <a :href="entry.wikji[2]" target="_blank">{{ entry.wikji[0] }}</a>
                      - {{ entry.wikji[3] }} : {{ entry.path == true ? "wikji" : "non" }} !
                    </li>
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer class="modal-card-foot">
        <button v-if="mode == 0" @click="wikji" :class="{ button: true, 'is-loading': isLoading }">Wikji !</button>
        <button v-if="mode != 0" @click="setMode(0)" class="button">Wikji !</button>
        <button @click="setMode(1)" class="button">Règles</button>
        <button @click="setMode(2)" class="button">Wikjis</button>
        <a href="https://twitter.com/wikjiji" target="_blank" class="button">Twitter</a>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import zevir from "@babouk/zevir";
import mousetrap from "mousetrap";
import { Component, Prop, Vue } from "vue-property-decorator";

import sam from "@babouk/sam";

@Component({
  components: {}
})
export default class Galdera extends Vue {
  aide: string = "";
  info: string = "";
  isLoading: boolean = false;
  labels: string = "";
  mode: number = 1;
  title: string = "Règles du jeu";
  //props: ["show"],
  close(): void {
    this.$emit("close");
  }
  setMode(mode: number): void {
    this.mode = mode;
    if (mode == 0) {
      this.title = "Validation";
    } else if (mode == 1) {
      this.title = "Règles du jeu";
    } else if (mode == 2) {
      this.title = "Wikjis";
    }
  }
  wikji(): void {
    this.isLoading = true;
    //this.labels = this.$refs.mots.value;
    const mots = this.labels.split(",").map(mot => mot.trim());
    sam
      .wikji(mots)
      .then((result: any) => {
        const data = result.data;
        this.isLoading = false;
        this.info = data;
        this.setMode(3);
      })
      .catch((err: Error) => {
        console.log(err);
        this.isLoading = false;
      });
  }
  mounted() {
    const that = this;
    //const htmlizer = new markdownIt();
    sam
      .getPage("aide-wikji")
      .then((data: any) => {
        zevir.htmlize(data.content).then((output: any)=> {
          let html = output;
          this.aide = html.replace(/(href="[^"]*")/g, '$1 target="_blank"');
        });
        
      })
      .catch((err: Error) => console.log(err));
    mousetrap.bind("esc", this.close);
  }
  beforeDestroy(): void {
    mousetrap.unbind("esc");
  }
}
</script>
