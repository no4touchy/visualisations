var ClosestPair = {};

ClosestPair.algorithm = (function(){
    // Cached variables
    var animationList;  // AnimationList object
    var boundingBox;    // Bounding box that encompases all points
    var allPoints;      // All point store
    var sortPoints;     // SortedPoints object
    var objectCache;    // Cache of graphics objects

    /* --- START SortedPoints --- */
    function SortedPoints(points){
        /*  Constructor for SortedPoints
         *  (array of THREE.Vector3) -> SortedPoints
         *  Runtime: O(n ln n)
         */

        // Define sorting function
        var sorting = function(axis){
            return points.sort(function(a, b){
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
            return boundingBox.contains(point);
        });
    }
    /* --- END SortedPoints*/

    /* --- START main logic --- */
    function findPairMaxAxis(boundingBox){
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
         *  (array of THREE.Vector3) -> array of THREE.Vector3
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

        if(lines.length == 0){ // Only two points
            ClosestPair.animations.addLine(objectCache, animationList, lines[0], true);
        }else{ // Three points
            ClosestPair.animations.addLines(objectCache, animationList, lines, false);
            ClosestPair.animations.selectLine(objectCache, animationList, closest);
            // ClosestPair.animations.removeLines(objectCache, animationList, badLines);
        }

        // Return closest
        return closest;
    }

    function findPair(boundingBox, points){
        /*  Find the closest pair of points
         *  (THREE.Box3, array of THREE.Vector3) -> array of THREE.Vector3
         *  Runtime: O(n ln n)
         */

        var closest = null;

        // Bruteforce approach
        if(points.length <= 3){
            return findPairBruteforce(points);
        }

        //var partitionedPoints = findPairPartitionPoints(boundingBox, points);

        // Return result
        return closest;
    }
    /* --- END main logic --- */

    /* --- START function --- */
    return function(points, pointObjects){
        /*  Function in charge of executing algorithm
         *  (array of THREE.Vector3, array of THREE.Object3D) -> ClosestPair
         */

        // Fill up cache'd variables
        animationList = new visualisations.AnimationList();
        boundingBox = new THREE.Box3();
        sortedPoints = new SortedPoints(points);
        allPoints = points;
        objectCache = {
            points: pointObjects,
            lines: {},
            boxes: {}
        };

        // Generate initial boundingBox
        boundingBox.setFromPoints(points);
        console.log(boundingBox);

        var result = findPair(boundingBox, points);

        return {
            animationList: animationList,   // AnimationList object
            result: [null, null]            // array of THREE.Vector3, representing the closest pair
        };
    };
    /* --- END function --- */
})();
