var ClosestPair = (function() {
    function PointList(points) {
        /** (array of THREE.Vector3 (augmented with uuid from meshes)) -> ClosestPair.PointList
         *  A point list object, usefull for resorting previously sorted lists of points
         *  O(n ln n) time
        **/
        var sort = function(axis){
            return points.slice(0).sort(function(a, b) {
                return a.getComponent(axis) - b.getComponent(axis);
            });
        };
        this.sorted = [
            sort(0),
            sort(1),
            sort(2),
        ];
    };
    PointList.prototype.resort = function(boundingBox, axis) {
        /** (THREE.Box3, integer) -> Object{uuid: sortedIndex}
         *  Find the points in the bounding box along the axis.
         *  O(n) time
        **/
        return this.sorted[axis].filter(function (n) {
            return boundingBox.min.getComponent(axis) <= n.getComponent(axis) &&
                n.getComponent(axis) <= boundingBox.max.getComponent(axis);
        });
    };

    function findMaxAxis(box) {
        /** (THREE.Box3) -> integer
         *  Fix axis with largest dimensions, ignoring some axis
         *  O(1) time
        **/
        // Find dimensions of bounding box
        var dim = [];
        for(var i = 0;i < 3;i++) {
            dim.push(Math.abs(box.max.getComponent(i) - box.min.getComponent(i)));
        }
        // Find axis with spanning size
        return dim.indexOf(Math.max.apply(Math, dim));
    }

    function _findMiddlePair(points, axis, animationList) {
        /** (array of 2 arrays of THREE.Vector3, integer, visualisations.AnimationList) ->
         *  Find closest pair in middle partition
         *  O(n) time
        **/
        var analyzePoints = function (a, b) {
            /** (THREE.Vector3, THREE.Vector3) -> Object
             *  Automatically handles out of bounds errors 
             *  Worst Case: O(1)
            **/
            try {
                return {
                    pair: [a, b],
                    distance: a.distanceTo(b),
                };
            } catch(err) {
                    return {pair: null, distance: Number.POSITIVE_INFINITY,};
            }
        };
        var comparePairs = function(a, b){
            /** (Object, Object) -> Object
             *  Returns the object pair with the smallest distance
             *  Worst Case: O(1)
            **/
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

    function findPairBruteforce(points, boundingBox, animationList){
        /** (array of THREE.Vector3, THREE.Box3, visualisations.AnimationList) -> 
         *  Find the pair of points with the smallest distance, max 3 points
         *  O(1) time
        **/
        var findClosest = function(currentClosest, points, i, j) {
            /** (Objects, array of THREE.Vector3, integer, integer) -> null
             * 
            **/
            var dist = points[i].distanceTo(points[j]);
            if(dist < currentClosest.distance) {
                currentClosest.distance = dist;
                currentClosest.pair = [points[i], points[j]];
            }
        }
        
        // Declare default
        var closest = {pair: points, distance: Number.POSITIVE_INFINITY,}
        
        // Bound check in case >= 2 points
        if(points.length > 1) {
            findClosest(closest, points, 0, 1);
        }
        // Bound check in case = 3 points
        if(points.length == 3) {
            findClosest(closest, points, 0, 2);
            findClosest(closest, points, 1, 2);
        }
        
        // Return closest point
        return closest;
    }

    function findPairContext(points, boundingBox, animationList, sortCache) {
        /** (array of THREE.Vector3, THREE.Box3, visualisations.AnimationList, PointList) -> Object
         *  Creates a new context object so as to reduce redundancies
         *  O(1) time
        **/
        
        // Vanilla variables, provided by function call
        this.points = points;
        this.boundingBox = boundingBox;
        this.animationList = animationList;
        this.sortCache = sortCache;
        
        // Extra storage
        this.closest = null;
        
        // Variables created by partitionPoints call
        this.divisionAxis = -1;
        this.sortedPoints = null;
        this.medianIndex = -1;
        this.median = Number.NaN;
        this.boundingBoxes = null;
        this.partitionedPoints = null;
        
        // Variables created by partitionMiddle call
        this.middleBoxes = null;
        this.middlePoints = null;
        this.secondDivisionAxis = -1;
    }
    
    function partitionPoints(context) {
        /** (findPairContext) -> null
         *  Partition points in 2 distinct divisions and update the context
         *  O(n) time
        **/
        // Find axis with maximum distance and resort points on that axis
        context.divisionAxis = findMaxAxis(context.boundingBox);
        context.sortedPoints = context.sortCache.resort(context.boundingBox, context.divisionAxis);
        // Find median
        context.medianIndex = context.sortedPoints.length / 2;
        context.median = (  context.sortedPoints[Math.floor(context.medianIndex)].getComponent(context.divisionAxis) +
                            context.sortedPoints[Math.ceil(context.medianIndex)].getComponent(context.divisionAxis)) / 2;
        // Make new bounding boxes
        context.boundingBoxes = [context.boundingBox.clone(), context.boundingBox.clone()];
        context.boundingBoxes[0].max.setComponent(context.divisionAxis, context.median);
        context.boundingBoxes[1].min.setComponent(context.divisionAxis, context.median);
        // Partition points
        context.partitionedPoints = [[], []];
        for (var i = 0;i < context.sortedPoints.length;i++) {
            var partition = context.sortedPoints[i].getComponent(context.divisionAxis) < context.median ? 0 : 1;
            context.partitionedPoints[partition].push(context.sortedPoints[i]);
        }
    }
    
    function partitionMiddlePoints(context) {
        /** (findPairContext) -> null
         *  Partition points in 2 distinct middle divisions and update the context
         *  O(n) time
        **/
        
        // Make new middle bouding boxes
        context.middleBoxes = [context.boundingBoxes[0].clone(), context.boundingBoxes[1].clone()];
        context.middleBoxes[0].min.setComponent(context.divisionAxis, context.median - context.closest.distance);
        context.middleBoxes[1].max.setComponent(context.divisionAxis, context.median + context.closest.distance);
        // Find closest pair in the middle partitions
        context.secondDivisionAxis = (context.divisionAxis + 1) % 3;
        context.middlePoints = [
            context.sortCache.resort(context.middleBoxes[0], context.divisionAxis),
            context.sortCache.resort(context.middleBoxes[1], context.divisionAxis)
        ];
        
        for(var i = 0;i < context.middlePoints[0].length;i++) {
            for(var j = 0;j < context.middlePoints[1].length;j++) {
                //console.log([context.middlePoints[0][i].uuid, context.middlePoints[1][j].uuid]);
                if(context.middlePoints[0][i].uuid === context.middlePoints[1][j].uuid) {
                    console.log(context.middlePoints[0][i]);
                    console.log(context.closest.distance);
                    console.log(context.median);
                    console.log(context.divisionAxis);
                    throw "Point in both lists";
                }
            }
        }
    }

    function findMiddlePair(points, axis, animationList) {
        /** (array of 2 arrays of THREE.Vector3, integer, visualisations.AnimationList) ->
         *  Find closest pair in middle partition
         *  O(n) time
        **/
        var analyzePoints = function (a, b) {
            /** (THREE.Vector3, THREE.Vector3) -> Object
             *  Automatically handles out of bounds errors 
             *  Worst Case: O(1)
            **/
            try {
                return {
                    pair: [a, b],
                    distance: a.distanceTo(b),
                };
            } catch(err) {
                    return {pair: null, distance: Number.POSITIVE_INFINITY,};
            }
        };
        var comparePairs = function(a, b){
            /** (Object, Object) -> Object
             *  Returns the object pair with the smallest distance
             *  Worst Case: O(1)
            **/
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


    function findPair(points, boundingBox, animationList, sortCache) {
        /** (array of THREE.Vector3, THREE.Box3, visualisations.AnimationList, PointList) -> 
         *  Find the pair of points with the smallest distance
         *  O(n ln n) time
        **/
        
        // 3 or less points
        if (points.length <= 3) {
            return findPairBruteforce(points, boundingBox, animationList);
        }
        
        // Create a new context
        var context = new findPairContext(points, boundingBox, animationList, sortCache);
        
        // Partition points
        partitionPoints(context);
        
        // Recursively solve problem
        var division = [0, 0];
        division[0] = findPair(context.partitionedPoints[0], context.boundingBoxes[0], animationList, sortCache);
        division[1] = findPair(context.partitionedPoints[1], context.boundingBoxes[1], animationList, sortCache);
        
        // Find the closer pair
        var indexOfClosest = division[0].distance < division[1].distance ? 0 : 1;
        context.closest = division[indexOfClosest];
        
        // Partition middle points
        partitionMiddlePoints(context);
        
        // Find points with minimum distance in the middle section
        var middleClosest = findMiddlePair(context.middlePoints, context.divisionAxis, animationList);
        
        // Return closer pair
        return context.closest.distance < middleClosest.distance ? context.closest : middleClosest;
    }

    function setup(numPoints, boundingBox) {
        /** (integer, THREE.Box3) -> Null
         * 
        **/
        // Find the length of the bounding box on each axis
        var length = new THREE.Vector3(
            Math.abs(boundingBox.max.getComponent(0) - boundingBox.min.getComponent(0)),
            Math.abs(boundingBox.max.getComponent(1) - boundingBox.min.getComponent(1)),
            Math.abs(boundingBox.max.getComponent(2) - boundingBox.min.getComponent(2))
        );
        // Generate random points inside bounding box
        var points = [], vectors = [];
        var box = new THREE.Object3D();
        var random = function() {return Math.floor(Math.random() * 1000) / 1000;};
        for (var i = 0;i < numPoints;i++) {
            var vector = new THREE.Vector3(
                random() * length.getComponent(0) + boundingBox.min.getComponent(0),
                random() * length.getComponent(1) + boundingBox.min.getComponent(1),
                random() * length.getComponent(2) + boundingBox.min.getComponent(2)
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
        
        var pointCache = new PointList(vectors);
        var animationList = new visualisations.AnimationList();
        var result = findPair(vectors, boundingBox, animationList, pointCache);
        
        return {
            vectors: vectors,
            points: points,
            
            res: result,
        };
    }
    
    function init3D(points, size) {
        return setup(
            points,
            new THREE.Box3(
                new THREE.Vector3(-size, -size, -size),
                new THREE.Vector3( size,  size,  size)
            )
        );
    }

    return {
        init3D: init3D,
        findPair: findPair,
    };
})();
