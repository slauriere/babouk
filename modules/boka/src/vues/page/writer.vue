<!-- resource editor -->
<template>
  <section class="write">
    <!-- <hr /> -->
    <div class="editor">
      <codemirror
        ref="editor"
        :key="key('codemirror')"
        :id="key('codemirror')"
        :value="view.page.body"
        :options="options"
        @ready="onCodeMirrorReady"
        @focus="onCodeMirrorFocus"
        @input="onCodeMirrorContentUpdate"
      ></codemirror>
    </div>
    <!-- TipTap: <editor-content ref="editor" :editor="editor"/> -->
  </section>
</template>

<script lang="ts">
//import {Editor, EditorContent} from 'tiptap' // TipTap
import { codemirror } from "vue-codemirror";
import "codemirror/mode/markdown/markdown";
import "codemirror/lib/codemirror.css";
//import "codemirror/theme/oceanic-next.css";
import mousetrap from "mousetrap";
import {Component, Prop, Vue} from "vue-property-decorator";

import { View } from "@babouk/model";

import bus from "../../main/bus";
import utils from "../utils.js";

@Component({
  components: {
    codemirror: codemirror,
    // TipTap: //'editor-content': EditorContent,
  },
  mixins: [utils]
})
export default class Writer extends Vue {
  @Prop({})
  view: View;

  options = {
    tabSize: 2,
    mode: "markdown",
    lineNumbers: false,
    lineWrapping: true,
    line: true,
    //theme: "oceanic-next"
  };

  //codemirror: ;
  //updatedContent: undefined
  //editor: null, // TipTap
  focus(): void {
    const editor: any = this.$refs.editor;
    editor.cminstance.focus();
    // https://github.com/codemirror/CodeMirror/issues/2469
    //this.$refs.editor.cminstance.refresh();
  }
  getContent(): string {
    //return this.page.body;
    const editor: any = this.$refs.editor;
    let content: string = editor.content;
    // The content can be empty in case it has not been edited yet (weird). In that case, we fall back to the page body
    if (content === undefined || content.length === 0) content = this.view.page.body;
    return content;
  }
  key(name: string): string {
    return `${name}-${this.urize(this.view.page.reference)}`;
  }
  onCodeMirrorReady(cm: any): void {}
  onCodeMirrorFocus(cm: any): void {}
  onCodeMirrorContentUpdate(content: string): void {
    // TODO: use debounce here to avoid propagating changes on each key stroke, see https://vuejs.org/v2/guide/computed.html
    // TODO: we may get rid of this property
    //his.updatedContent = content;
    // The line below creates some overhead, not sure why, but in any case page is a prop here so it's meant to be immutable

    if (this.view.saved === undefined || this.view.saved === true) {
      this.$set(this.view, "saved", false);
    }
    // A debounce is needed, e.g. https://medium.com/vuejs-tips/tiny-debounce-for-vue-js-cea7a1513728 but issue with "this" type
    // this.view.page.body = content;
  }

  setupKeyActions() {
    // Key bindings need to be define for the editor as well in order to override the browser defaults
    const editorElement = document.getElementById(this.key("codemirror"));
    mousetrap(editorElement).bind("ctrl+s", () => {
      bus.$emit("page-save", this.getContent());
      return false;
    });
  }
  mounted(): void {
    // TipTap this.editor = new Editor({content: '<p>A paragraph</p>',})
    // TODO: see how to transfer this value directly via the properties instead
    //this.$refs.editor.content = this.content;
    //console.log("editor", this.editor);
    
    this.deactivateDynamicStyles();
    this.focus();
    this.setupKeyActions();
    bus.$on(`page-save-${this.urize(this.view.page.reference)}`, () => {
      bus.$emit("page-save", this.getContent());
    });
  }

  updated(): void {
    // needed to keep key shortcuts upon tab close / open, weird
    //this.setupKeyActions();
  }
  //watch: {
  // TODO: check
  // Make sure that the focus is brought to the newly activated tab
  //  selected: function(value): void {
  //    if (value) {
  //      this.focus();
  //    }
  //  }
  // }
}
</script>
