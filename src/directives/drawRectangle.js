angular.module("leaflet-directive").directive('drawRectangle', function ($window, $compile, $log, $rootScope, leafletData, leafletHelpers, $timeout, $parse) {
        return {
            restrict: "A",
            scope: false,
            replace: false,
            priority: -10,
            require: 'leaflet',

            link: function (scope, element, attrs, controller) {
                var isDefined = leafletHelpers.isDefined;

                var mode;
                controller.getMap().then(function (map) {

                    var container;
                    var links = {};
                    var drawRectangle = $parse(attrs.drawRectangle);
                    var mapContainer = map.getContainer();
                    var DrawRectangleControl = L.Control.extend({
                        options: {
                            position: 'topleft'
                        },

                        onAdd: function (/*map*/) {
                            container = L.DomUtil.create('div', 'draw-rectangle-toggle leaflet-control leaflet-bar');
                            function _createButton(title, innerHtml, clickFunction) {

                                var domVar = L.DomUtil.create('a', 'draw-rectangle', container);
                                domVar.href = '#';
                                domVar.innerHTML = innerHtml;
                                domVar.title = title;

                                L.DomEvent
                                    .on(domVar, 'click', L.DomEvent.stopPropagation)
                                    .on(domVar, 'mousedown', L.DomEvent.stopPropagation)
                                    .on(domVar, 'dblclick', L.DomEvent.stopPropagation)
                                    .on(domVar, 'click', L.DomEvent.preventDefault)
                                    .on(domVar, 'click', clickFunction);

                                return domVar;
                            }

                            links.move = _createButton('Drag to pan map', '<i class="fa fa-arrows"></i>', moveClick);
                            links.select = _createButton('Draw to select', '<i class="fa fa-pencil"></i>', selectClick);
                            links.erase = _createButton('Draw to erase', '<i class="fa fa-eraser"></i>', eraseClick);

                            return container;
                        }
                    });

                    function x2long(x,z) {
                        return ((x/256)/Math.pow(2,z)*360-180);
                    }
                    function y2lat(y,z) {
                        var n=Math.PI-2*Math.PI*(y/256)/Math.pow(2,z);
                        return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
                    }

                    function long2x(lon,zoom) { return (Math.floor(((lon+180)/360*Math.pow(2,zoom)*256)+0.5)); }
                    function lat2y(lat,zoom)  { return (Math.floor(((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom) * 256)+0.5)); }

                    function moveClick() {
                        setMode('move');
                    }

                    function selectClick() {
                        setMode('select');
                    }

                    function eraseClick() {
                        setMode('erase');
                    }

                    function setMode(newMode) {
                        if (!isDefined(newMode) || newMode !== mode) {
                            switch (newMode) {
                                case 'select':
                                    mode = 'select';
                                    L.DomUtil.removeClass(links.move, 'active');
                                    L.DomUtil.removeClass(links.erase, 'active');
                                    L.DomUtil.addClass(links.select, 'active');
                                    $timeout(function () {
                                        L.DomUtil.addClass(mapContainer, 'draw-rectangle-active');
                                        map.dragging.disable();
                                        map.on('mousedown', mousedown);
                                    }, 10);
                                    break;
                                case 'erase':
                                    mode = 'erase';
                                    L.DomUtil.removeClass(links.move, 'active');
                                    L.DomUtil.removeClass(links.select, 'active');
                                    L.DomUtil.addClass(links.erase, 'active');
                                    $timeout(function () {
                                        L.DomUtil.addClass(mapContainer, 'draw-rectangle-active');
                                        map.dragging.disable();
                                        map.on('mousedown', mousedown);
                                    }, 10);
                                    break;
                                case 'move':
                                    mode = 'move';
                                    if (L.DomUtil.hasClass(links.erase, 'active')) {
                                        L.DomUtil.removeClass(links.erase, 'active');
                                    }
                                    L.DomUtil.removeClass(links.select, 'active');
                                    L.DomUtil.addClass(links.move, 'active');
                                    $timeout(function () {
                                        L.DomUtil.removeClass(mapContainer, 'draw-rectangle-active');
                                        map.dragging.enable();
                                        map.off('mousedown', mousedown);
                                    }, 10);
                                    break;
                            }
                            if (typeof mode !== 'undefined') {
                                drawRectangle.assign(scope, mode);
                            }

                        }
                    }


                    function onKeyPress(e) {
                        console.log(e);
                    }

                    map.addControl(new DrawRectangleControl());
                    L.DomEvent.on(mapContainer, 'keypress', onKeyPress);

                    var startCorner, finishCorner, rectangle, bMousedown;

                    scope.$watch(function() { return drawRectangle(scope); }, function (newValue) {
                        setMode(newValue);
                    });

                    var scrollTimeout = null;

                    function autoScroll(x, y, movingCorner) {

                        if(scrollTimeout !== null) {
                            clearTimeout(scrollTimeout);
                        }

                        if (rectangle) {
                            var zoom = map.getZoom();
                            movingCorner.lng = x2long(long2x(movingCorner.lng,zoom) + x,zoom);
                            movingCorner.lat = y2lat(lat2y(movingCorner.lat,zoom) + y,zoom);
                            rectangle.setBounds([startCorner, movingCorner]);
                            map.panBy([x, y], { animate: false });
                            scrollTimeout = setTimeout(function() { autoScroll(x,y, movingCorner); }, 10);
                        }
                    }

                    function mousedown(e) {
                        if ((mode === 'select' || mode === 'erase') && !bMousedown) {
                            bMousedown = true;
                            if (rectangle) {
                                map.removeLayer(rectangle);
                            }
                            startCorner = e.latlng;
                            map.on('mousemove', mousemove);
                            map.on('mouseup', mouseup);
                            var bounds = [startCorner, startCorner];
                            $rootScope.$broadcast('leafletDirectiveMap.drawRectangleStart', e, bounds, mode);
                        }
                    }

                    function mousemove(e) {
                        var scrollZoneHeight = 50;

                        function getScrollAmount(edgeDistance) {
                            var panStepSize = 10;
                            var edgeFactor = edgeDistance < 1 ? 1 : edgeDistance;
                            return Math.round((((scrollZoneHeight-edgeFactor)/scrollZoneHeight) * panStepSize) + 0.5);
                        }

                        if (bMousedown && (mode === 'select' || mode === 'erase')) {
                            var currentCorner = e.latlng;
                            var bounds = [startCorner, currentCorner];
                            if (!rectangle) {
                                rectangle = L.rectangle(bounds, {
                                    opacity: 1,
                                    color: 'grey',
                                    weight: 1,
                                    fillOpacity: 0.2,
                                    dashArray: '2,2'
                                }).addTo(map);
                            } else {
                                rectangle.setBounds(bounds);
                            }
                            $rootScope.$broadcast('leafletDirectiveMap.drawRectangleUpdate', e, bounds, mode);
                            // autoscroll if necessary

                            var currentPoint = e.containerPoint;
                            var mapSize = map.getSize();
                            var x = 0;
                            var y = 0;
                            if (currentPoint.x < scrollZoneHeight) {
                                x -= getScrollAmount(currentPoint.x);
                            }

                            if ((mapSize.x - currentPoint.x) < scrollZoneHeight) {
                                x += getScrollAmount(mapSize.x - currentPoint.x);
                            }

                            if (currentPoint.y < scrollZoneHeight) {
                                y -= getScrollAmount(currentPoint.y);
                            }

                            if ((mapSize.y - currentPoint.y) < scrollZoneHeight) {
                                y += getScrollAmount(mapSize.y - currentPoint.y);
                            }
                            if (x===0 && y===0) {
                                clearTimeout(scrollTimeout);
                                scrollTimeout = null;
                            } else {
                                autoScroll(x,y,currentCorner);
                            }

                        } else {
                            map.off('mousemove', mousemove);
                        }
                    }

                    function mouseup(e) {
                        bMousedown = false;
                        finishCorner = e.latlng;
                        map.off('mousemove', mousemove);
                        map.off('mouseup', mouseup);
                        if (rectangle) {
                            map.removeLayer(rectangle);
                            rectangle = null;
                        }
                        var bounds = [startCorner, finishCorner];
                        $rootScope.$broadcast('leafletDirectiveMap.drawRectangleDone', e, bounds, mode);
                    }
                });
            }
        };
    }
);