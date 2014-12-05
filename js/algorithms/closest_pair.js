var ClosestPair = {};

ClosestPair.algorithm = (function(){
    // Cached variables
    var animationList;  // AnimationList object
    var boundingBox;    // Bounding box that encompases all points
    var allPoints;      // All point store
    var sortPoints;   // SortedPoints object
    var objectCache;    // Cache of graphics objects

    /* --- START SortedPoints --- */
    function SortedPoints(points){
        /*  Constructor for SortedPoints
         *  (array of THREE.Vector3) -> SortedPoints
         *  Runtime: O(n ln n)
         */

        // Define sorting function
        var sorting = function(axis){
            return points.slice(0).sort(function(a, b){
                return a.getComponent(axis) - b.getComponent(axis);
            });
        };

        // Sort the points and save them
        this.points = [
            sorting(0),
            sorting(1),
            sorting(2)
        ];
    }
    SortedPoints.prototype.resort = function(boundingBox, axis){
        /*  Using the presorted lists of points, return an array of points sorted on some axis
         *  (THREE.Box3, int) -> array of THREE.Vector3
         *  Runtime: O(n)
         */
        return this.points[axis].filter(function(point){
            return boundingBox.containsPoint(point);
        });
    }
    /* --- END SortedPoints*/

    /* --- START main logic --- */
    function findMaxAxis(boundingBox){
        /*  Returns the axis with the greatest dimension
         *  (THREE.Box3) -> int
         *  Runtime: O(1)
         */

        // Calculate dimensions
        var dimensions = [
            Math.abs(boundingBox.max.getComponent(0) - boundingBox.min.getComponent(0)),
            Math.abs(boundingBox.max.getComponent(1) - boundingBox.min.getComponent(1)),
            Math.abs(boundingBox.max.getComponent(2) - boundingBox.min.getComponent(2))
        ];

        // Find maximum dimension
        var maxDimension = Math.max.apply(Math, dimensions);

        // Return index of dimension
        return dimensions.indexOf(maxDimension);
    
    }

    function findPairBruteforce(points){
        /*  Bruteforce the closest pair of points
         *  (array of THREE.Vector3) -> array of 2 THREE.Vector3
         *  Runtime: O(1)
         */

        // Make sure there are enough points to compare
        if(points.length <= 1){
            return null;
        }

        // Declare the variables
        var closest = [points[0], points[1]];
        var contender = null;
        var lines = [[points[0], points[1]]];
        var badLines = [];

        // Compare against [points[1], points[2]] and [points[2], points[0]] if needed
        for(var i = 1;i < 3 && points.length == 3;i++){
            contender = [points[i], points[(i + 1) % 3]];
            lines.push([points[i], points[(i + 1) % 3]]);
            if(closest[0].distanceTo(closest[1]) > contender[0].distanceTo(contender[1])){
                badLines.push(closest);
                closest = contender;
            }else{
                badLines.push(contender);
            }
        }

        /* Animations not fully completed yet
         * if(lines.length == 0){ // Only two points
            ClosestPair.animations.addLine(objectCache, animationList, lines[0], true);
        }else{ // Three points
            ClosestPair.animations.addLines(objectCache, animationList, lines, false);
            ClosestPair.animations.selectLine(objectCache, animationList, closest);
            // ClosestPair.animations.removeLines(objectCache, animationList, badLines);
        }*/

        // Return closest
        return closest;
    }

    function partitionPoints(boundingBox, points){
        /*  Partition the points
         *  Returns an object containing the partition subboxes in boxes and partitioned points in points
         *  (THREE.Box3, array of THREE.Vector3) -> {boxes, points}
         *  Runtime: O(n)
         */

        // Sort points
        var divisionAxis = findMaxAxis(boundingBox);
        var sortedPoints = sortPoints.resort(boundingBox, divisionAxis);

        // Points length mismatch error
        if(points.length != sortedPoints.length){
            console.log("partitionPoints(): point number mismatched from return of SortedPoints.resort()");
            console.log(boundingBox);
            console.log(points);
            console.log(sortedPoints);
            console.log("partitionPoints() end");
        }

        // Partition points
        var splitIndex = Math.ceil(sortedPoints.length / 2);
        var partitionedPoints = [[], []];
        for(var i = 0;i < sortedPoints.length;i++){
            partitionedPoints[(i < splitIndex) ? 0 : 1].push(sortedPoints[i]);
        }

        // Find the median
        var median = (  partitionedPoints[0][splitIndex - 1].getComponent(divisionAxis) +
                        partitionedPoints[1][0].getComponent(divisionAxis)) / 2;

        // Construct sub-boxes
        var boundingBoxes = [boundingBox.clone(), boundingBox.clone()];
        boundingBoxes[0].max.setComponent(divisionAxis, median);
        boundingBoxes[1].min.setComponent(divisionAxis, median);

        return {
            boxes: boundingBoxes,
            points: partitionedPoints
        };
    }

    function findClosestPair(pair1, pair2){
        /*  Return the closest pair out of the two given
         *  (array of 2 THREE.Vector3, array of 2 THREE.Vector3) -> array of 2 THREE.Vector3
         *  Runtime: O(1)
         */
        
        // Check for null
        if(pair1 === null){
            return pair2;
        }else if(pair2 === null){
            return pair1;
        }

        // Find the closest pair
        if(pair1[0].distanceTo(pair1[1]) <= pair2[0].distanceTo(pair2[1])){
            return pair1;
        }
        return pair2;
    }

    function findMiddlePair(boundingBox, partitionBoxes, partitionedPoints, maxDistance){
        /*  Find the closest pair of points that might cross over the division of the partition boxes
         *  (THREE.Box3, array of 2 THREE.Box3, array of 2 arrays of THREE.Vector3, int) -> array of 2 THREE.Vector3
         *  Runtime: O(n)
         */

        // Find division axis, median, and threshold
        var divisionAxis = findMaxAxis(boundingBox);
        var median = (  partitionedPoints[0][partitionedPoints[0].length - 1].getComponent(divisionAxis) +
                        partitionedPoints[1][0].getComponent(divisionAxis)) / 2;
        var threshold = maxDistance + 1e-5;

        // Construct middle partition boxes
        var middlePartitionBoxes = [partitionBoxes[0].clone(), partitionBoxes[1].clone()];
        middlePartitionBoxes[0].min.setComponent(divisionAxis, median - threshold);
        middlePartitionBoxes[1].max.setComponent(divisionAxis, median + threshold);

        // Find middle partitioned points
        var middlePartitionedPoints = [
            sortPoints.resort(middlePartitionBoxes[0], divisionAxis),
            sortPoints.resort(middlePartitionBoxes[1], divisionAxis)
        ];

        var closest = null;
        var i = 0, j = 0
        var m = [middlePartitionedPoints[0].length, middlePartitionedPoints[1].length]
        while (i < m[0] && j < m[1]) {
            var current = [middlePartitionedPoints[0][i], middlePartitionedPoints[1][j]], next = null;
            if (i < m[0] && current[0].getComponent(divisionAxis) >= current[1].getComponent(divisionAxis)) {
                if(j < m[1] - 1){
                    next = [middlePartitionedPoints[0][i], middlePartitionedPoints[1][j + 1]];
                }
                i++;
            } else {
                if(i < m[0] - 1){
                    next = [middlePartitionedPoints[0][i + 1], middlePartitionedPoints[1][j]];
                }
                j++;
            }

            closest = findClosestPair(closest, findClosestPair(current, next));
        }

        // Return a closest pair with distance < maxDistance or null
        if(closest !== null && closest[0].distanceTo(closest[1]) < maxDistance){
            return closest;
        }
        return null;
    }

    function findPair(boundingBox, points){
        /*  Find the closest pair of points
         *  (THREE.Box3, array of THREE.Vector3) -> array of THREE.Vector3
         *  Runtime: O(n ln n)
         */

        var closest = null;
        var returnValues;

        // Bruteforce approach
        if(points.length <= 3){
            return findPairBruteforce(points);
        }

        // Partition points
        var returnValues = partitionPoints(boundingBox, points);
        var partitionBoxes    = returnValues.boxes;
        var partitionedPoints = returnValues.points;

        // Recursively solve problem
        var recursiveResult = [null, null];
        recursiveResult[0] = findPair(partitionBoxes[0], partitionedPoints[0]);
        recursiveResult[1] = findPair(partitionBoxes[1], partitionedPoints[1]);

        closest = findClosestPair(recursiveResult[0], recursiveResult[1]);

        // Check for null before checking middle points
        if(closest !== null){
            var middle = findMiddlePair(boundingBox, partitionBoxes, partitionedPoints, closest[0].distanceTo(closest[1]));
            if(middle !== null){
                closest = middle;
            }
        }

        // Return result
        return closest;
    }
    /* --- END main logic --- */

    function bruteforceClosestPair(points){
        var closestPair = null;
        var minDistance = Number.POSITIVE_INFINITY;

        var l = points.length;
        for(var i = 0;i < l;i++){
            for(var j = i + 1;j < l;j++){
                var distance = points[i].distanceTo(points[j]);
                if(distance < minDistance){
                    minDistance = distance;
                    closestPair = [points[i], points[j]];
                }
            }
        }

        return closestPair;
    }

    /* --- START function --- */
    return function(points, pointObjects){
        /*  Function in charge of executing algorithm
         *  (array of THREE.Vector3, array of THREE.Object3D) -> ClosestPair
         */

        // Fill up cache'd variables
        animationList = new visualisations.AnimationList();
        boundingBox = new THREE.Box3();
        sortPoints = new SortedPoints(points);
        allPoints = points;
        objectCache = {
            points: pointObjects,
            lines: {},
            boxes: {}
        };

        // Generate initial boundingBox
        boundingBox.setFromPoints(points);
        console.log(boundingBox);

        var result  = findPair(boundingBox, points);
        var result2 = bruteforceClosestPair(points);

        ClosestPair.animations.addLine(objectCache, animationList, result, true);
        ClosestPair.animations.addLine(objectCache, animationList, result2, false);
        animationList.nextAnimation();
        animationList.nextAnimation();

        console.log(result);

        console.log("ClosestPair distance = " + result[0].distanceTo(result[1]));
        console.log("Bruteforce  distance = " + result2[0].distanceTo(result2[1]));

        return {
            animationList: animationList,   // AnimationList object
            result: [null, null]            // array of THREE.Vector3, representing the closest pair
        };
    };
    /* --- END function --- */
})();
