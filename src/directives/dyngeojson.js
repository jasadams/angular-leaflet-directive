angular.module("leaflet-directive").directive('dyngeojson', function ($log, $rootScope, $timeout, leafletData, leafletHelpers) {
        return {
            restrict: "A",
            scope: false,
            replace: false,
            require: 'leaflet',

            link: function (scope, element, attrs, controller) {
                var safeApply = leafletHelpers.safeApply,
                    isDefined = leafletHelpers.isDefined,
                    leafletScope = controller.getLeafletScope(),
                    leafletGeoJSON = {};

                var dyngeojson = scope.$eval(attrs.dyngeojson);
                var _loadedFeatures = {};
                controller.getMap().then(function (map) {
                    if (!(isDefined(dyngeojson))) {
                        return;
                    }

                    var resetStyleOnMouseout = dyngeojson.resetStyleOnMouseout,
                        onEachFeatureSupp = dyngeojson.onEachFeature;

                    var onEachFeature = function (feature, layer) {

                        _loadedFeatures[feature.id] = layer;
                        if (leafletHelpers.LabelPlugin.isLoaded() && isDefined(dyngeojson.label)) {
                            layer.bindLabel(feature.properties.description);
                        }

                        layer.on({
                            mouseover: function (e) {
                                safeApply(leafletScope, function () {
                                    dyngeojson.selected = feature;
                                    $rootScope.$broadcast('leafletDirectiveMap.geojsonMouseover', e, leafletGeoJSON);
                                });
                            },
                            mouseout: function (e) {
                                if (resetStyleOnMouseout) {
                                    leafletGeoJSON.resetStyle(e.target);
                                }
                                safeApply(leafletScope, function () {
                                    dyngeojson.selected = undefined;
                                    $rootScope.$broadcast('leafletDirectiveMap.geojsonMouseout', e, leafletGeoJSON);
                                });
                            },
                            click: function (e) {
                                safeApply(leafletScope, function () {
                                    dyngeojson.selected = feature;
                                    $rootScope.$broadcast('leafletDirectiveMap.geojsonClick', e, leafletGeoJSON);
                                });
                            }
                        });

                        onEachFeatureSupp(feature, layer);
                    };

                    dyngeojson.options = {
                        style: dyngeojson.style,
                        onEachFeature: onEachFeature
                    };

                    leafletGeoJSON = L.geoJson({
                        "type": "FeatureCollection",
                        "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::4283" } },
                        "features": []
                    }, dyngeojson.options);
                    leafletData.setGeoJSON(leafletGeoJSON);
                    leafletGeoJSON.addTo(map);
                    $rootScope.$broadcast('leafletDirectiveMap.dyngeojsonSetupDone', leafletGeoJSON);


                    function addFeature(featureId, oFeature) {
                        setTimeout(function () {
                            if (!_loadedFeatures.hasOwnProperty(oFeature.id)) {
                                leafletGeoJSON.addData(oFeature);
                            } else {
                                leafletGeoJSON.removeLayer(_loadedFeatures[oFeature.id]);
                                leafletGeoJSON.addData(oFeature);
                            }
                        });
                    }

                    function removeFeature(featureId, oFeature) {
                        setTimeout(function () {
                            if (_loadedFeatures.hasOwnProperty(oFeature.id)) {
                                leafletGeoJSON.removeLayer(_loadedFeatures[oFeature.id]);
                                delete _loadedFeatures[oFeature.id];
                            }
                        });
                    }

                    dyngeojson.features.onAdd = addFeature;
                    dyngeojson.features.onRemove = removeFeature;
                });
            }
        };
    });
