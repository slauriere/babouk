<!-- Widget displaying notification messages (xabar = message, information) -->
<template>
  <!-- https://github.com/vue-bulma/notification -->
  <transition
    :name="transition"
    mode="in-out"
    appear
    :appear-active-class="getActiveClass"
    :enter-active-class="getActiveClass"
    :leave-active-class="getLeaveClass"
    @after-leave="afterLeave"
  >
    <div :class="['notification', 'animated', type ? `is-${type}` : '']" v-if="show">
      <button class="delete touchable" @click="closedByUser()" aria-label="close"></button>
      <div class="title is-5" v-if="title">{{ title }}</div>
      <div v-if="html" v-html="message"></div>
      <div v-else>{{ message }}</div>
    </div>
  </transition>
</template>

<script>
import Vue from "vue";

export default {
  props: {
    type: String,
    title: String,
    message: String,
    direction: {
      type: String,
      default: "Right"
    },
    duration: {
      type: Number,
      default: 4500
    },
    container: {
      type: String,
      default: ".notifications"
    },
    html: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      $_parent_: null,
      show: true
    };
  },

  created() {
    let $parent = this.$parent;
    if (!$parent) {
      let parent = document.querySelector(this.container);
      if (!parent) {
        // Lazy creating `div.notifications` container.
        const className = this.container.replace(".", "");
        const notifications = Vue.extend({
          name: "Notifications",
          render(h) {
            return h("div", {
              class: {
                [`${className}`]: true
              }
            });
          }
        });
        $parent = new notifications().$mount();
        document.body.appendChild($parent.$el);
      } else {
        $parent = parent.__vue__;
      }
      // Hacked.
      this.$_parent_ = $parent;
    }
  },

  mounted() {
    if (this.$_parent_) {
      this.$_parent_.$el.appendChild(this.$el);
      this.$parent = this.$_parent_;
      delete this.$_parent_;
    }
    if (this.duration > 0) {
      this.timer = setTimeout(() => this.close(), this.duration);
    }
  },

  destroyed() {
    this.$el.remove();
  },

  computed: {
    transition() {
      return `bounce-${this.direction}`;
    },

    getActiveClass() {
      return `bounceIn${this.direction}`;
    },

    getLeaveClass() {
      return `bounceOut${this.direction}`;
    }
  },

  methods: {
    closedByUser() {
      this.$emit("closed-by-user");
      clearTimeout(this.timer);
      this.show = false;
    },

    close() {
      this.$emit("closed-automatically");
      clearTimeout(this.timer);
      this.show = false;
    },

    afterLeave() {
      this.$destroy();
    }
  }
};
</script>
