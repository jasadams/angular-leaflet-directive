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
                if (isDefined(L.Control.Pan) && isDefined(controls.pan)) {

                    var panOptions = {
                        position: 'topleft',
                        panOffset: 500
                    };
                    angular.extend(panOptions, controls.pan.options);
                    var panControl = new L.Control.Pan(panOptions);
                    map.addControl(panControl);
                }
                if (isDefined(controls.zoom)) {
                    var zoomOptions = {
                        position: 'topleft'
                    };
                    angular.extend(zoomOptions, controls.zoom.options);
                    var zoomControl = new L.Control.Zoom(zoomOptions);
                    map.addControl(zoomControl);
                }
                if (isDefined(L.Control.Draw) && isDefined(controls.draw)) {
					var drawnItems = new L.FeatureGroup();
					map.addLayer(drawnItems);
					var options = {
						edit: {
							featureGroup: drawnItems
						}
					};
					angular.extend(options, controls.draw.options);
					
                    var drawControl = new L.Control.Draw(options);
                    map.addControl(drawControl);
                }
                
                if(isDefined(controls.custom)) {
					for(var i in controls.custom) {
						map.addControl(controls.custom[i]);
					}
                }
            });
        }
    };
});
