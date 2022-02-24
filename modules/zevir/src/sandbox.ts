
import zevir from "./index.js";

let str = `

{ 
  "title": "bonjour", 
  "list": Promise.resolve([1, "lll", 2]), 
  "subtitle": "Irmat !"
}

--- ---

::: script
title = "bonjour"
list = Promise.resolve([1, "lll", 2])
subtitle = "Irmat !"
:::

['hhhh', 1, true]

::: div
::: div
_xxl_{class="icon"} Comment y arriver ?
:::
:::

::: script
something: "bonsoir"
:::

::: hello
This is some div content

  ::: button
  image: something
  :::
:::


::: div columns is-multiline is-mobile
::: div column is-12-mobile is-9-tablet pois
::: grid
spans: {mobile: [12], tablet: [6, 6]}
{{~[1,2,3] :poi:index}}
-
abel: bonbnobnobnb {{=poi}}
something: else
{{~}}
:::
:::
::: div column is-12-mobile is-3-tablet
::: div
## Mon plan
:::
::: div
## Informations pratiques

![](.settings/media/transport.svg){class="icon"} Comment y arriver ?

![](.settings/media/schedule.svg) Horaires d'ouverture
:::
:::
:::

::: aside class-one class-two
> ...BlockContent...

# hhheh
{something}

![alt](img){ height=50 }

conbnjour
:::

::: hero
:::

::: hero
- _aloha_
- charlie
:::

::: map
- items
:::

::: tableau
- items
:::

::: tableau
::: rings
title: Contents
:::
|

::: rings
title: Coordinates
:::
:::

::: form action="." my-little-form method="post"

bonjour

:::

::: grid
items:
  - media: hello.jpg@bonojur
    label: Bonjour
::: 

::: style
reference: hello
:::

::: slide bonjour style="object-position: 0 15%"
reference: xxl
:::

::: slide something xxl
reference: xxl
:::

::: slide style="object-position: 0 15%" bonsoir
reference: zzl
:::

# hello jj \n{class='bonjour'}

# {[ title ]}

- {[ list[0] ]} (string)
- {[ list[1] ]} (number)
- {[ list[2] ]} (boolean)

::: form action="/handler" style="100%" something="hello"
afalkjfajza
:::

> {[ subtitle ]}

{{~it.list :value:index}}
* [{{=value}}]({{=value}})
{{~}}
* [hello](bonjour)
`;

//const data = { "title": "bonjour", "list": ['hhhh', 1, true], "subtitle": "Irmat !" };

// str = `
// ::: div
// ::: button is-light
// _xxl_{class="icon"} Comment y arriver ?
// :::
// :::
// `;

zevir.htmlize(str).then((output: any) => {
  console.log(output);
})


