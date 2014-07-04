var ClosestPair = (function () {
    'use strict';

    var PointList = function (points) {
        /** (array of THREE.Vector3 (augmented with uuid from meshes)) -> ClosestPair.PointList
         *  A point list object, usefull for resorting previously sorted lists of points
         *  O(n ln n) time
         */
        this.sorted = [
            points.sort(function (a, b) {return a.getComponent(0) - b.getComponent(0);}),
            points.sort(function (a, b) {return a.getComponent(1) - b.getComponent(1);}),
            points.sort(function (a, b) {return a.getComponent(2) - b.getComponent(2);}),
        ];
    };
    PointList.prototype.resort = function (boundingBox, axis) {
        /** (THREE.Box3, integer) -> Object{uuid: sortedIndex}
         *  Find the points in the bounding box along the axis.
         *  O(n) time
         */
        return this.sorted[axis].filter(function (n) {
            return boundingBox.min.getComponent(axis) <= n.getComponent(axis) &&
                n.getComponent(axis) <= boundingBox.max.getComponent(axis);
        });
    };


    function findMaxAxis (box, excludeAxis) {
        /** (THREE.Box3[, integer]) -> integer
         *  Fix axis with largest dimensions, ignoring some axis
         *  O(1) time
         */
         if (excludeAxis === undefined) {
             excludeAxis = -1;
         }
        // Find dimensions of bounding box
        var max = box.max.toArray(),
            min = box.min.toArray();
        var dim = [];
        for (var i = 0;i < max.length;i++) {
            dim.push(i != excludeAxis ? Math.abs(max[i] - min[i]) : -1);
        }
        // Find axis with spanning size
        return dim.indexOf(Math.max.apply(Math, dim));
    }

    function findMiddlePair (points, axis, animationList) {
        /** (array of 2 arrays of THREE.Vector3, integer, visualisations.AnimationList) ->
         *  Find closest pair in middle partition
         *  O(n) time
         */
        var analyzePoints = function (a, b) {
            /** (THREE.Vector3, THREE.Vector3) -> Object
             *  Automatically handles out of bounds errors 
             *  Worst Case: O(1)
             */
            try {
                return {
                    pair: [a, b],
                    distance: a.distanceTo(b),
                };
            } catch (err) {
                    return {pair: null, distance: Number.POSITIVE_INFINITY,};
            }
        };
        var comparePairs = function(a, b){
            /** (Object, Object) -> Object
             *  Returns the object pair with the smallest distance
             *  Worst Case: O(1)
             */
            return a.distance < b.distance ? a : b;
        };
        var closest = {pair: null, distance: Number.POSITIVE_INFINITY,};
        var i = 0, j = 0, m = Math.min(points[0].length, points[1].length);
        while (i < m && j < m) {
            var current = analyzePoints(points[0][i], points[1][j]), next;
            if (points[0][i].getComponent(axis) >= points[1][j].getComponent(axis)) {
                next = analyzePoints(points[0][i], points[1][j + 1]);
                i++;
            } else {
                next = analyzePoints(points[0][i + 1], points[1][j]);
                j++;
            }
            closest = comparePairs(closest, comparePairs(current, next));
        }
        return closest;
    }

    function findPair (points, boundingBox, animationList, sortCache) {
        /** (array of THREE.Vector3, THREE.Box3, visualisations.AnimationList, PointList) -> 
         *  Find the pair of points with the smallest distance
         *  O(n ln n) time
         */
        // 3 or less points
        if (points.length <= 3) {
            var pair = points;
            var minimumDistance = Number.POSITIVE_INFINITY;
            var list = [[0, 1], [0, 2], [1, 2]];
            for (var i = 0;i < 3;i++) {
                var dist = list[i][0].distanceTo(list[i][1]);
                if (dist < minimumDistance) {
                    minimumDistance = dist;
                    pair = [list[i][0], list[i][1]];
                }
            }
            return {
                pair: pair,
                distance: minimumDistance,
            };
        }
        // Find axis with maximum distance and resort points on that axis
        var divisionAxis = findMaxAxis(boundingBox);
        var sortedPoints = sortCache.resort(boundingBox, divisionAxis);
        // Find median
        var medianIndex = sortedPoints.length / 2;
        var median = (  sortedPoints[Math.floor(medianIndex)].getComponent(divisionAxis) +
                        sortedPoints[Math.ceil(medianIndex)].getComponent(divisionAxis)) / 2;
        // Make new bounding boxes
        var boxes = [boundingBox.clone(), boundingBox.clone()];
        boxes[0].max.setComponent(node.divisionAxis, median);
        boxes[1].min.setComponent(node.divisionAxis, median);
        // Partition points
        var partionedPoints = [[], []];
        for (var i = 0;i < sortedPoints.length;i++) {
            var partition = sortedPoints[i].getComponent(divisionAxis) < median ? 0 : 1;
            partionedPoints[partition].push(sortedPoints[i]);
        }
        // Recursively solve problem
        var division = [0, 0];
        division[0] = findPair(points, boxes[0], animationList, sortCache);
        division[1] = findPair(points, boxes[1], animationList, sortCache);
        // Find the closer pair
        var divisionIndex = division[0].distance < division[1].distance ? 0 : 1;
        var closest = division[divisionIndex];
        // Make new middle bouding boxes
        var middleBoxes = [boxes[0].clone(), boxes[1].clone()];
        middleBoxes[0].min.setComponent(divisionAxis, median - closest.distance);
        middleBoxes[1].max.setComponent(divisionAxis, median + closest.distance);
        // Find closest pair in the middle partitions
        var secondDivisionAxis = findMaxAxis(boundingBox, divisionAxis);
        var middlePoints = [
            sortCache.resort(middleBoxes[0], secondDivisionAxis),
            sortCache.resort(middleBoxes[1], secondDivisionAxis)
        ];
        var middleClosest = findMiddlePair(middlePoints, divisionAxis, animationList);
        // Return closer pair
        return closest.distance < middleClosest.distance ? closest : middleClosest;
    }

    var setup = function (numPoints, boundingBox) {
        /** (integer, THREE.Box3) -> Null
         * 
         */
        // Find the length of the bounding box on each axis
        var length = new THREE.Vector3(
            Math.abs(boundingBox.max.getComponent(0) - boundingBox.min.getComponent(0)),
            Math.abs(boundingBox.max.getComponent(1) - boundingBox.min.getComponent(1)),
            Math.abs(boundingBox.max.getComponent(2) - boundingBox.min.getComponent(2))
        );
        // Generate random points inside bounding box
        var points = [], vectors = [];
        var box = new THREE.Object3D();
        for (var i = 0;i < numPoints;i++) {
            var vector = new THREE.Vector3(
                Math.random() * length.getComponent(0) + boundingBox.min.getComponent(0),
                Math.random() * length.getComponent(1) + boundingBox.min.getComponent(1),
                Math.random() * length.getComponent(2) + boundingBox.min.getComponent(2)
            );
            var point = visualisations.vector2Point(vector);
            vector.uuid = point.uuid;
            vectors.push(vector);
            points.push(point);
            box.add(point);
        }
        
        // Initialize graphics
        var g = visualisations.threeSetup(".container");
        
        // Create box and directional lines
        g.scene.add(box);
        for (var i = 0;i < 3;i++) {
            var ends = [new THREE.Vector3(), new THREE.Vector3()];
            ends[1].setComponent(i, 1.0);
            box.add(visualisations.vectors2Line(
                ends,
                new THREE.LineBasicMaterial({color: 0xff << (8 * i)})
            ));
        }
        
        // Redraw function
        function redraw(){
            console.log("redraw called");
            box.rotation.y += 0.01;
            g.renderer.render(g.scene, g.camera);
            visualisations.requestAnimationFrame(redraw);
        }
        redraw();
        
        return {
            vectors: vectors,
            points: points,
        };
    };

    return {
        init3d: function (points, size) {
            return setup(points, new THREE.Box3(
                new THREE.Vector3(-size, -size, -size),
                new THREE.Vector3( size,  size,  size)
            ));
        },
    };
})();
