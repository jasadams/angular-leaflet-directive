angular.module("leaflet-directive").directive('drawRectangle', ['$window','$compile', '$log', '$rootScope', 'leafletData', 'leafletHelpers',
  '$timeout', function ($window, $compile, $log, $rootScope, leafletData, leafletHelpers, $timeout) {
    return {
      restrict: "A",
      scope: false,
      replace: false,
      require: 'leaflet',

      link: function(scope, element, attrs, controller) {
        var safeApply = leafletHelpers.safeApply,
          isDefined = leafletHelpers.isDefined,
          leafletScope  = controller.getLeafletScope();

        var mode;
        controller.getMap().then(function(map) {

          var container;
          var links={};
          var mapContainer = map.getContainer();
          var DrawRectangleControl = L.Control.extend({
            options: {
              position: 'topleft'
            },

            onAdd: function (map) {
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
              links.select =_createButton('Draw to select', '<i class="fa fa-pencil"></i>', selectClick);
              links.erase = _createButton('Draw to erase', '<i class="fa fa-eraser"></i>', eraseClick);

              return container;
            }
          });

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
              switch(newMode) {
                case 'select':
                  mode = 'select';
                  L.DomUtil.removeClass(links.move, 'active');
                  L.DomUtil.removeClass(links.erase, 'active');
                  L.DomUtil.addClass(links.select, 'active');
                  $timeout(function() {
                    L.DomUtil.addClass(mapContainer, 'draw-rectangle-active');
                    map.dragging.disable();
                    map.on('mousedown', mousedown);
                  },10);
                  break;
                case 'erase':
                  mode = 'erase';
                  L.DomUtil.removeClass(links.move, 'active');
                  L.DomUtil.removeClass(links.select, 'active');
                  L.DomUtil.addClass(links.erase, 'active');
                  $timeout(function() {
                    L.DomUtil.addClass(mapContainer, 'draw-rectangle-active');
                    map.dragging.disable();
                    map.on('mousedown', mousedown);
                  },10);
                  break;
                case 'move':
                  mode = 'move';
                  if (L.DomUtil.hasClass(links.erase, 'active')){
                    L.DomUtil.removeClass(links.erase, 'active');
                  }
                  L.DomUtil.removeClass(links.select, 'active');
                  L.DomUtil.addClass(links.move, 'active');
                  $timeout(function() {
                    L.DomUtil.removeClass(mapContainer, 'draw-rectangle-active');
                    map.dragging.enable();
                    map.off('mousedown', mousedown);
                  },10);
                  break;
              }
              scope[attrs.drawRectangle] = mode;
            }
          }
          map.addControl(new DrawRectangleControl());
          L.DomEvent.on(mapContainer, 'keypress', onKeyPress);

          function onKeyPress (e) {
            console.log(e);
          }
          var startCorner, finishCorner, rectangle, bMousedown;

          scope.$watch('drawRectangle', function(newValue){
            setMode(newValue);
          });

          function autoScroll(currentPoint, mapSize) {
            // autoscroll if necessary
            var scrollZoneHeight = 50;
            var panStepSize = 5;
            var leftX = currentPoint.x;
            var rightX = mapSize.x - currentPoint.x;
            var topY = currentPoint.y;
            var bottomY = mapSize.y - currentPoint.y;

            var x = 0;
            var y = 0;

            if (leftX < scrollZoneHeight) {
              x -= panStepSize;
            }

            if (rightX < scrollZoneHeight) {
              x += panStepSize;
            }

            if (topY < scrollZoneHeight) {
              y -= panStepSize;
            }

            if (bottomY < scrollZoneHeight) {
              y += panStepSize;
            }

            map.panBy([x,y]);
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
              autoScroll(e.containerPoint, map.getSize());
            } else {
              map.off('mousemove', mousemove);
            }
          }

          function mouseup(e)
          {
            bMousedown=false;
            finishCorner = e.latlng;
            map.off('mousemove', mousemove);
            map.off('mouseup', mouseup);
            if (rectangle) {
              map.removeLayer(rectangle);
              rectangle=null;
            }
            var bounds = [startCorner, finishCorner];
            $rootScope.$broadcast('leafletDirectiveMap.drawRectangleDone', e, bounds, mode);
          }
        });
      }
    };
  }
]);