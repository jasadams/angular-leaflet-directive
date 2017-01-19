angular.module("leaflet-directive").directive('controls', function ($log, leafletHelpers) {
    return {
        restrict: "A",
        scope: false,
        replace: false,
        require: '?^leaflet',

        link: function(scope, element, attrs, controller) {
			if(!controller) {
				return;
			}

            var isDefined = leafletHelpers.isDefined,
                leafletScope  = controller.getLeafletScope(),
                controls = leafletScope.controls;

            controller.getMap().then(function(map) {
                if (isDefined(L.Control.Pan)) {
                    var panOptions = {
                        position: 'topleft',
                        panOffset: 200
                    };
                    if (isDefined(controls) && isDefined(controls.pan) && isDefined(controls.pan.options)) {
                        angular.extend(panOptions, controls.pan.options);
                    }
                    var panControl = new L.Control.Pan(panOptions);
                    map.addControl(panControl);
                }
                var zoomOptions = {
                    position: 'topleft'
                };
                if (isDefined(controls) && isDefined(controls.zoom)) {
                    angular.extend(zoomOptions, controls.zoom.options);
                }
                var zoomControl = new L.Control.Zoom(zoomOptions);
                map.addControl(zoomControl);

                if (isDefined(L.Control.Draw)) {
					var drawnItems = new L.FeatureGroup();
					map.addLayer(drawnItems);
					var options = {
						edit: {
							featureGroup: drawnItems
						}
					};
                    if (isDefined(controls) && isDefined(controls.draw)) {
                        angular.extend(options, controls.draw.options);
                    }

                    var drawControl = new L.Control.Draw(options);
                    map.addControl(drawControl);
                }
                
                if(isDefined(controls) && isDefined(controls.custom)) {
					for(var i in controls.custom) {
						map.addControl(controls.custom[i]);
					}
                }
            });
        }
    };
});
