"use strict";

const path = require("path");
const { VueLoaderPlugin } = require("vue-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  // https://github.com/bootstrap-vue/bootstrap-vue/issues/3040
  /*resolve: {
    alias: {
      'vue$': 'dist/vue.esm.js'
    }
  },*/
  //runtimeCompiler: true, // see https://github.com/alexjoverm/v-runtime-template
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js' // https://vuejs.org/v2/guide/installation.html#Runtime-Compiler-vs-Runtime-only
    }
  },
  entry: "./src/main/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "boka.js"
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["vue-style-loader", "css-loader"]
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader"
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.vue$/,
        use: "vue-loader"
      },
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: {
          appendTsSuffixTo: [/\.vue$/]
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: "file-loader"
          }
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "boka.css"
    }),
    new VueLoaderPlugin()
  ]
};
