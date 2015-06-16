var ClosestPair = {};

ClosestPair.algorithm = (function(){
    // Cached variables
    var boundingBox;    // Bounding box that encompases all points
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

        ClosestPair.animations.findPairBruteforce(lines, closest, badLines);

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

    function findClosestPair(pairs, graphics){
        /*  Return the closest pair out of the two or three given given
         *  (array of arrays of 2 THREE.Vector3) -> array of 2 THREE.Vector3
         *  Runtime: O(N), however it is only run with pairs.length of 2 and 3
         */

        if(graphics === undefined){graphics = false;}

        distances = [];
        for(var i = 0;i < pairs.length;i++){
            distances.push(pairs[i] !== null ?
                pairs[i][0].distanceTo(pairs[i][1]) :
                Number.POSITIVE_INFINITY);
        }

        var closestIndex = distances.indexOf(Math.min.apply(Math, distances));
        var closestPair = pairs[closestIndex];
        var otherPairs = pairs.slice(0, closestIndex).concat(pairs.slice(closestIndex + 1, pairs.length));

        if(graphics){
            ClosestPair.animations.findClosestPair(closestPair, otherPairs);
        }
        return closestPair;
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
        var pairs = [];
        var i = 0, j = 0;
        var m = [middlePartitionedPoints[0].length, middlePartitionedPoints[1].length];
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

            pairs.push(current);
            if(next !== null){
                pairs.push(next);
                closest = findClosestPair([closest, current, next], false);
            }else{
                closest = findClosestPair([closest, current], false);
            }
        }

        // If no closer pair found, return
        if(closest === null){
            return null;
        }

        // Remove the closest pair from all others
        var badPairs = pairs.slice(0);
        for(var i = 0;i < pairs.length;i++){
            if(closest[0].equals(pairs[i][0]) && closest[1].equals(pairs[i][1])){
                badPairs = badPairs.slice(0, i).concat(badPairs.slice(i + 1, badPairs.length));
                break;
            }
        }
        ClosestPair.animations.findMiddlePair(closest, pairs, badPairs);

        // Return a closest pair with distance < maxDistance or null
        if(closest[0].distanceTo(closest[1]) < maxDistance){
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

        // Create a new context to store graphics objects
        ClosestPair.animations.pushContext();

        if (points.length <= 3) { // Bruteforce approach
            closest = findPairBruteforce(points);
        }else{ // Divide and conquer approach
            // Partition points
            var returnValues = partitionPoints(boundingBox, points);
            var partitionBoxes    = returnValues.boxes;
            var partitionedPoints = returnValues.points;

            // Animate the partition process
            ClosestPair.animations.showPartitionBoxes(partitionBoxes);

            // Recursively solve problem
            var recursiveResult = [null, null];
            recursiveResult[0] = findPair(partitionBoxes[0], partitionedPoints[0]);
            recursiveResult[1] = findPair(partitionBoxes[1], partitionedPoints[1]);

            closest = findClosestPair(recursiveResult, true);

            // Check for null before checking middle points
            if(closest !== null){
                var middle = findMiddlePair(boundingBox, partitionBoxes, partitionedPoints, closest[0].distanceTo(closest[1]));
                if(middle !== null){
                    closest = findClosestPair([closest, middle], true);
                }
            }
        }

        // Lose the graphics constext
        ClosestPair.animations.popContext();

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
        boundingBox = new THREE.Box3();
        sortPoints = new SortedPoints(points);
        ClosestPair.animations.init(pointObjects, {}, {});

        // Generate initial boundingBox
        boundingBox.setFromPoints(points);
        console.log(boundingBox);

        var result  = findPair(boundingBox, points);
        var result2 = bruteforceClosestPair(points);

        /*ClosestPair.animations.addLine(animationList, result, true);
        ClosestPair.animations.addLine(animationList, result2, false);
        animationList.nextAnimation();
        animationList.nextAnimation();*/

        console.log(result);

        console.log("ClosestPair distance = " + result[0].distanceTo(result[1]));
        console.log("Bruteforce  distance = " + result2[0].distanceTo(result2[1]));

        return {
            animationList: ClosestPair.animations.getAnimationList(),   // AnimationList object
            result: result                  // array of THREE.Vector3, representing the closest pair
        };
    };
    /* --- END function --- */
})();
