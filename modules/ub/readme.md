Ub is a Node.js application serving YAML files over HTTP with a simple REST API. It uses Express. 

## Configure

Edit `ub.yaml`:

```---
title: Ub
repository: '/home/dev/web/'
static: '/home/dev/boka/'
hostname: localhost
port: 3008
baseUrl: ''

```

https: add 'authbind --deep' to the start command in package.json


## Create sample data

In a the repository defined above, create a folder `hello` containing a file `index.yaml` with the sample content below, and put an image into the same folder.

```
abel: "Hello"
content: |
  Lorem ipsum dolor sit amen
```

## Install and run

```
yarn install
yarn run
```

Open a browser at http://localhost:3008/hello: you should see a JSON representation of the `hello` folder. The /fibra endpoint should list all the available resources.
