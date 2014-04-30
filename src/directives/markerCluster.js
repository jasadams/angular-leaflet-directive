angular.module("leaflet-directive").directive('markerCluster', function ($log, $rootScope, leafletData, leafletHelpers) {
    return {
        restrict: "A",
        scope: false,
        replace: false,
        require: 'leaflet',

        link: function (scope, element, attrs, controller) {
            var isDefined = leafletHelpers.isDefined;

            var markerCluster = scope.$eval(attrs.markerCluster);
            controller.getMap().then(function (map) {
                if (!(isDefined(markerCluster))) {
                    return;
                }

                if (!markerCluster.options) {
                    markerCluster.options = {

                    };
                }

                var _allMarkers = {};
                markerCluster.markers.forEach(function(geoJsonObj){
                    var newMarker =  new L.Marker([geoJsonObj.geometry.coordinates[1],geoJsonObj.geometry.coordinates[0]]);
                    newMarker.bindPopup('<b>' + geoJsonObj.properties.NAME + '</b><br>' + geoJsonObj.properties.ADDRESS);
                    _allMarkers[geoJsonObj.id] = newMarker;
                });
                var markers = new L.MarkerClusterGroup(markerCluster.options);
                var toAdd = [];
                for (var markerId in _allMarkers) {
                    if (_allMarkers.hasOwnProperty(markerId)) {
                        toAdd.push(_allMarkers[markerId]);
                    }
                }
                markers.addLayers(toAdd);
                map.addLayer(markers);

                function addMarkers(aId) {
                    var aMarker = [];
                    aId.forEach(function(sId){
                        aMarker.push(_allMarkers[sId]);
                    });
                    markers.addLayers(aMarker);
                }

                function removeMarkers(aId) {
                    var aMarker = [];
                    aId.forEach(function(sId){
                        aMarker.push(_allMarkers[sId]);
                    });
                    markers.removeLayers(aMarker);
                }

                markerCluster.add = addMarkers;
                markerCluster.remove = removeMarkers;
            });
        }
    };
});