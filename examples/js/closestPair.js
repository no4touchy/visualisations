window.ClosestPair = (function(){
    var point = {
        normal: new THREE.MeshBasicMaterial({
            color: 0x00ff00,
        }),
        selected: new THREE.MeshBasicMaterial({
            color: 0xff0000,
        }),
        geometry: new THREE.BoxGeometry(0.3, 0.3, 0.3),
    };
    var lineMaterial = new THREE.LineBasicMaterial({
        color: 0x0000ff,
    });
    
    var ClosestPair = {
        activity: new visualisations.ActivityQueue(),
        point: point,
        minimumLines: new THREE.Object3D(),
        
        vectors2Line: function(vectors){
            var geometry = new THREE.Geometry();
            geometry.vertices = vectors;
            return new THREE.Line(geometry, lineMaterial);
        },
        vector2Mesh: function(vector){
            var mesh = new THREE.Mesh(point.geometry, point.normal);
            mesh.position = vector;
            return mesh;
        },
        box2Mesh: function (box){
            var width  = Math.abs(box.max.x - box.min.x),
                height = Math.abs(box.max.y - box.min.y),
                depth  = Math.abs(box.max.z - box.min.z);
            var center = new THREE.Vector3(
                Math.min(box.max.x, box.min.x) + width / 2,
                Math.min(box.max.y, box.min.y) + height / 2,
                Math.min(box.max.z, box.min.z) + depth / 2);
            var mesh = new THREE.Mesh(
                new THREE.BoxGeometry(width, height, depth),
                new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    wireframe: true,
                })
            );
            mesh.position = center;
            return mesh;
        },
        
        findMaxAxis: function(box, excludeAxis){
            /** Finx axis with largest dimensions.
             * (Box3 [, integer]) -> integer
             */
             if(excludeAxis === undefined){
                 excludeAxis = -1;
             }
            /* --- Find dimensions of bounding box --- */
            var max = box.max.toArray(),
                min = box.min.toArray();
            var dim = [];
            for(var i = 0;i < max.length;i++){
                dim.push(i != excludeAxis ? Math.abs(max[i] - min[i]) : -1);
            }
            /* --- Find axis with smalles size --- */
            return dim.indexOf(Math.max.apply(Math, dim));
        },
        findMiddlePair: function(points, axis){
            var sortFunc = function(a, b){
                return a.position.getComponent(axis) - b.position.getComponent(axis);
            };
            var sPoints = [
                points[0].sort(sortFunc),
                points[1].sort(sortFunc),
            ];
            var closest = [
                null,
                Number.POSITIVE_INFINITY,
            ];
            var i = 0, j = 0, m = Math.min(sPoints[0].length, sPoints[1].length);
            var func = function(vectors){
                return (vectors[0] !== undefined && vectors[1] !== undefined) ? 
                    [vectors, vectors[0].position.distanceTo(vectors[1].position)] :
                    [null, Number.POSITIVE_INFINITY];
            };
            while(i < m && j < m){
                var closest1 = func([sPoints[0][i], sPoints[1][j]]),
                    closest2 = [null, Number.POSITIVE_INFINITY], tmp;
                if(sPoints[0][i].position.getComponent(axis) >= sPoints[1][j].position.getComponent(axis)){
                    closest2 = func([sPoints[0][i], sPoints[1][j + 1]]);
                    i++;
                }else{
                    closest2 = func([sPoints[0][i + 1], sPoints[1][j]]);
                    j++;
                }
                tmp = closest1[1] < closest2[1] ? closest1 : closest2;
                if(tmp[1] < closest[1]){
                    closest = tmp;
                }
            }
            return [
                ClosestPair.vectors2Line([
                    closest[0][0].position,
                    closest[0][1].position]
                ),
                closest[1],
            ];
        },
        findPair: function(points, boundingBox){
            /**
             * (array of Vector3, Box3) -> pair of Mesh
             */
            /* --- 1 or less points --- */
            if(points.length < 2){
                return [
                    null,
                    Number.POSITIVE_INFINITY,
                ];
            }
            /* --- Exactly 2 points --- */
            if(points.length == 2){
                var line = ClosestPair.vectors2Line([
                    points[0].position,
                    points[1].position,
                ]);
                ClosestPair.activity.enqueue(function(self){
                    ClosestPair.minimumLines.add(self);
                }, line);
                return [
                    line,
                    points[0].position.distanceTo(points[1].position),
                ];
            }
            /* --- Find max axis and sort boxes on that axis --- */
            var maxAxis = ClosestPair.findMaxAxis(boundingBox);
            var sPoints = points.sort(function(a, b){
                return a.position.getComponent(maxAxis) - b.position.getComponent(maxAxis);
            });
            /* --- Find median of sorted array --- */
            var medianIndex = sPoints.length / 2;
            var median = (  sPoints[Math.floor(medianIndex)].position.getComponent(maxAxis) +
                            sPoints[Math.ceil(medianIndex)].position.getComponent(maxAxis)) / 2;
            /* --- Find new bounding boxes --- */
            var boxes = [boundingBox.clone(), boundingBox.clone()];
            boxes[0].max.setComponent(maxAxis, median);
            boxes[1].min.setComponent(maxAxis, median);
            /* --- Partition points --- */
            var pPoints = [[], []];
            for(var i = 0;i < sPoints.length;i++){
                var partition = sPoints[i].position.getComponent(maxAxis) < median ? 0 : 1;
                pPoints[partition].push(sPoints[i]);
            }
            /* --- Find closest points in partitions --- */
            var closestPairs  = [];
            for(var i = 0;i < 2;i++){
                ClosestPair.activity.enqueue(function(points){
                    jQuery.each(points, function(i, point){
                        point.material = ClosestPair.point.selected;
                    });
                }, pPoints[i]);
                ClosestPair.activity.enqueue(function(points){
                    jQuery.each(points, function(i, point){
                        point.material = ClosestPair.point.normal;
                    });
                }, pPoints[i]);
                closestPairs.push(ClosestPair.findPair(pPoints[i], boxes[i]));
            }
            /* --- Find the closer pair --- */
            var closest = null;
            if(closestPairs[0][0] !== null){ // First recursive call returned minimum distance
                closest = closestPairs[0];
                if(closestPairs[1][0] !== null){ // Second recursive call returned minimum distance
                    var closestIndex = (closestPairs[0][1] < closestPairs[1][1]) ? 0 : 1;
                    closest = closestPairs[closestIndex];
                    ClosestPair.activity.enqueue(function(self){
                        ClosestPair.minimumLines.remove(self[0]);
                    }, closestPairs[(closestIndex + 1) % 2]);
                }else{ // Only first recursive call returned minimum distance
                }
            }else if(closestPairs[1][0] !== null){ // Only second recursive call returned minimum distance
                closest = closestPairs[1];
            }
            /* --- Handle middle partition points --- */
            var middle = ClosestPair.findMiddlePair(
                pPoints,
                ClosestPair.findMaxAxis(boundingBox, maxAxis)
            );
            if(middle[1] < closest[1]){
                ClosestPair.activity.enqueue(function(self){
                    ClosestPair.minimumLines.remove(self[0][0]);
                    ClosestPair.minimumLines.add(self[1][0]);
                }, [closest, middle]);
                closest = middle;
            }
            return closest;
        },
    };
    
    return ClosestPair;
})();
