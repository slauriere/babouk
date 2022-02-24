<!-- a map -->
<template>
  <div class="map">
    <!-- <div v-if="body.trim().length > 0" class="description" v-html="body"></div> -->
    <l-map ref="map" :zoom="zoom" :center="center" :options="mapOptions" @update:center="onCentered" @update:zoom="onZoomed">
      <l-tile-layer :url="tiles" :attribution="attribution" :noWrap="true" />
      <l-marker v-for="(point, index) in points" :key="point.reference" :lat-lng="point.coordinates" @add="openPopup">
        <l-icon :icon-anchor="getIcon().options.iconAnchor" :icon-size="getIcon().options.iconSize" :popup-anchor="getIcon().options.popupAnchor">
          <img :src="getIcon().options.iconUrl" alt="icon" />
          <span :class="getIndexClass(index)">{{ index + 1 }}</span></l-icon
        >
        <l-popup>
          <section class="media">
            <figure v-if="point.image !== undefined && point.image.url !== undefined" class="media-left">
              <img :src="point.image.url" alt="icon" />
            </figure>
            <div class="media-content">
              <div class="content">
                <h2 class="title is-h2">
                  <a
                    :href="urize(resolve(point.reference, undefined, PAGE, language))"
                    @click="emit('page-open', resolve(point.reference, undefined, PAGE, language))"
                    v-on:click.prevent
                    v-html="point.label"
                  ></a>
                </h2>
                <p v-if="point.description !== undefined && point.description.length > 0" v-html="point.description"></p>
              </div>
            </div>
          </section>
        </l-popup>
      </l-marker>
      <!--<l-polyline v-for="step in steps" :key="`${step.id}-polyline`" :lat-lngs="step.route" color="#97709a" />-->
    </l-map>
  </div>
</template>

<script lang="ts">
/**
 * Several types of map pages (named after [famous cartographers](https://en.wikipedia.org/wiki/List_of_cartographers))
 * - Oronce (from Oronce Finé):
 *    - The page contains a list of items with a title, a description and coordinates.
 *    - Example: Izenah city map
 * - Tobler (from Walto Tobler):
 *    - Same as Oronce, except the markers are positioned by their pixel coordinates on an image (for interior plans, photographies, paintings, ...)
 *    - Not supported
 * - Delisle (from Guillaume Delisle):
 *    - The page has properties "items" and "geo-relation". The latter lists the relation(s) to be used for retrieving the item coordinates.
 *    - Example: balade Gradiva
 * - Ogilby (from John Ogilby, also illustrator):
 *   - The page has a property "query" which is an array of (relation, type) tuples. Example: [["~contains", "*"], ["contains", "scene"], ["has-coordinates", "*"]]] means: from the current page, retrieve all relatums of rings with relation "contains inverse" and any type, then, from these relatums, all rings with relation "contains" and type "scene", then all values of rings with relation "has-coordinates".
 *   - Example: BLG map
 */
import { Component, Prop, Vue } from "vue-property-decorator";
import yaml from "js-yaml";

import { Type, resolveSet } from "@babouk/model";

import { Icon, latLng, LatLngBounds } from "leaflet";
import { LIcon, LMap, LTileLayer, LMarker, LPolyline, LPopup, LTooltip } from "vue2-leaflet";

delete Icon.Default.prototype._getIconUrl;

// Needed to avoid 404 on initial marker loading
Icon.Default.mergeOptions({
  iconRetinaUrl: "icons/leaflet/marker-icon-2x.png",
  iconUrl: "icons/leaflet/marker-icon.png",
  shadowUrl: "icons/leaflet/marker-shadow.png",
});

import "leaflet/dist/leaflet.css";

import sam from "@babouk/sam";
import zevir from "@babouk/zevir";

import utils from "../utils.js";
import bus from "../../main/bus";

@Component({
  mixins: [utils],
  name: "xmap",
  components: {
    LIcon,
    LMap,
    LTileLayer,
    LMarker,
    LPolyline,
    LPopup,
    LTooltip,
  },
})
export default class Map extends Vue {
  body: string = "";
  zoom: number = 3;
  center = latLng(500, 500);
  tiles: string = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  attribution: string = "";
  mapOptions: any = {
    zoomSnap: 0.5,
  };
  map: any = {};
  activeMarkerIndex = -1;
  language: string = "default";
  PAGE: string = Type.PAGE;

  points: any = new Array<any>();

  popupIndex = 0;

  openPopup(event: any): void {
    const props = this.$store.state.properties;
    if (props.popup === true) {
      this.$nextTick(() => {
        if (this.activeMarkerIndex === this.popupIndex) {
          setTimeout(() => event.target.openPopup(), 300);
        }
        this.popupIndex++;
      });
    }
  }

  getIcon(): any {
    if (this.$store.state.settings.maps !== undefined && this.$store.state.settings.maps.marker !== undefined) {
      return new Icon({
        iconUrl: this.$store.state.settings.maps.marker.url,
        iconSize: this.$store.state.settings.maps.marker.size,
        iconAnchor: this.$store.state.settings.maps.marker.anchor,
        popupAnchor: this.$store.state.settings.maps.marker.popup !== undefined ? this.$store.state.settings.maps.marker.popup.anchor : [0, 0],
      });
    } else {
      return new Icon({
        iconRetinaUrl: "icons/leaflet/marker-icon-2x.png",
        iconUrl: "icons/leaflet/marker-icon.png",
        shadowUrl: "icons/leaflet/marker-shadow.png",
      });
    }
  }

  getIndexClass(index: number): string {
    if (index + 1 < 10) {
      return "index one-digit";
    } else if (index + 1 < 100) {
      return "index two-digits";
    } else {
      return "index more-than-two-digits";
    }
  }

  async ogilby(data: any): Promise<void> {
    let coeff = 0;

    let center = data.center;
    let zoom = data.zoom;
    let maxBounds: any = undefined;

    // Get properties which may have been stored by other macros upper in the page
    const props = this.$store.state.properties;
    this.language = props.language || this.language;
    if (data.type === "ogilby") {
      // this.map.setMinZoom(0);
      // this.map.setMaxZoom(3);
      // const width = 1201, height = 997, tileSize = 256;
      if (data.size !== undefined) {
        const width = data.size[0],
          height = data.size[1],
          tileSize = 256;
        // Based on leaflet-rastercoords plugin
        coeff = Math.ceil(Math.log(Math.max(width, height) / tileSize) / Math.log(2));
        const southWest = this.map.unproject([0, height], coeff);
        const northEast = this.map.unproject([width, 0], coeff);
        maxBounds = new LatLngBounds(southWest, northEast);
        if (data.center !== undefined) center = this.map.unproject(data.center, coeff);
        else center = this.map.unproject([width / 2, height / 2], coeff);
      } else {
        console.log("Image size information is missing");
      }
    }

    let points = new Array<any>();
    console.log("props", props);
    if (data.query !== undefined) {
      const rings = await sam.getRings(this.resolve(data.query.referent), data.query.relations, undefined, data.query.types, 1, data.query.sort, this.language);
      rings.forEach((ring: any, index: number) => {
        let coordinates = data.type === "ogilby" ? this.map.unproject(ring.value, coeff) : ring.value.reverse();
        points.push({
          reference: this.katonoma(ring.referent.reference),
          label: ring.referent.title,
          coordinates: coordinates,
        });

        // center map on current reference if it matches the one defined in the store, saved from a calling page
        if (props !== undefined && this.katonoma(ring.referent.reference) === props.center) {
          center = coordinates;
          this.activeMarkerIndex = index;
        }
      });
    }
    if (data.images !== undefined) {
      const rings = await sam.getRings(this.resolve(data.images.referent), data.images.relations, undefined, data.images.types, 1, data.images.sort);
      rings.forEach((ring: any, index: number) => {
        if (points.length > index && points[index] !== undefined) points[index].image = this.toMedia(ring.value);
      });
    }

    if (props !== undefined && props.zoom !== undefined) {
      zoom = props.zoom;
    }

    // This is because updating the center itself won't fire the map center update as expected
    // TODO: we may want to use vue-async-computed instead, in order to set the center property only once it has been computed asynchronously
    setTimeout(() => {
      // TODO: handle the case when an error is raised due to the fact the map may have disappeared in the meantime, e.g. if the user switched to edit mode
      if (maxBounds !== undefined) this.map.setMaxBounds(maxBounds);
      this.map.setView(center, zoom);
      // Add points only at the end to avoid see them moving on screen until the map gets ready
      this.points = points;
      //this.center = center;
    }, 200);
  }

  async delisle(data: any): Promise<void> {
    const geoRelations = data["geo-relations"];
    const aek = resolveSet(geoRelations, this.$store.state.sphere);

    this.attribution = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>';
    // this.map.addAttribution(this.attribution);

    // Save routes in a map, so that they get injected into the point objects once built from the retrieved rings
    const routes = data.items.reduce((map: any, point: any) => {
      map[point.reference] = point.route;
      return map;
    }, {});

    // Store call promises for obtaining each step coordinates
    let jobs = data.items.map((step: any) => {
      const eie = this.resolve(step.reference);
      return sam.getRings(eie, aek);
    });
    Promise.all(jobs).then((data) => {
      data.forEach((list: any) => {
        if (list.length < 1) return;
        const z = list[0];
        if (z.value != null && Array.isArray(z.value)) {
          const id = this.katonoma(z.referent.reference);
          const label = zevir.htmlizeSync(z.referent.title);
          this.points.push({
            reference: id,
            label: label,
            coordinates: z.value.reverse(),
            route: routes[id],
          });
        }
      });
      // console.log(this.toGeoJson());
    });
  }

  async oronce(data: any): Promise<void> {
    let coeff = 0;
    const props = this.$store.state.properties;

    if (data.items !== undefined) {
      data.items.forEach((item: any) => {
        let coordinates = item.coordinates.reverse();
        // TODO: maybe sync method should be used instead
        const description = zevir.htmlizeSync(item.description || "");
        this.points.push({
          id: item.reference,
          coordinates: coordinates,
          description: description,
          label: item.label,
        });
        // center map on current reference if it matches the one defined in the store, saved from a calling page
        if (props !== undefined && item.reference === props.center) {
          this.center = coordinates;
        }
      });
    }
    if (props !== undefined && props.zoom !== undefined) {
      this.zoom = props.zoom;
    }
    // This is because updating the center itself won't fire the map center update as expected
    // TODO: we may want to use vue-async-computed instead, in order to set the center property only once it has been computed asynchronously
    setTimeout(() => {
      this.map.setView(this.center);
    }, 200);
  }

  mounted(): void {
    const data = this.parseNodeBody();
    // Calling `nextTick` is recommended in the vue2-leaflet documentation
    this.$nextTick(() => {
      this.map = (this.$refs.map as any).mapObject;
      this.map.attributionControl.setPrefix("");
      if (data.tiles !== undefined) this.tiles = data.tiles;
      //if (data.center !== undefined) this.center = latLng(data.center.reverse());
      //if (data.zoom !== undefined) this.zoom = data.zoom;

      if (data.type === "cook" || data.type === "ogilby") {
        this.ogilby(data);
      } else if (data.type === "delisle") {
        this.delisle(data);
      } else if (data.type === "oronce") {
        this.oronce(data);
      }
    });
  }

  toGeoJson(): string {
    let str = `{
      "type": "FeatureCollection",
      "features": [`;
    this.points.forEach((step: any, index: number) => {
      if (index > 0) str += ",\n";
      str += `{
          "type": "Feature",
          "properties": {},
          "geometry": {
            "type": "Point",
            "coordinates": [${[...step.coordinates]}]
          }
        }`;
    });
    return str + "]}";
  }

  emit(eventName: string, ...args: any): void {
    bus.$emit(eventName, ...args);
  }

  onZoomed(zoom: any) {}
  onCentered(center: any) {}

  updated(): void {
    // TODO: render content only in non write submode
    //this.draw();
  }
}
</script>
<style>
.leaflet-pane {
  z-index: 10;
}

.leaflet-top,
.leaflet-bottom {
  z-index: 15;
}

.leaflet-popup-content-wrapper {
  border-radius: inherit;
}

.leaflet-container {
  background-color: white;
}
</style>
