var ClosestPair = (function() {
    
    // PointList class - usefull for resorting points
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
    }
    PointList.prototype.resort = function(boundingBox, axis) {
        /** (THREE.Box3, integer) -> Object{uuid: sortedIndex}
         *  Find the points in the bounding box along the axis.
         *  O(n) time
        **/
        return this.sorted[axis].filter(function (n) {
            return boundingBox.containsPoint(n);
        });
    };

    // FindPairContext class - usefull for sharing data across different calls
    function FindPairContext(points, boundingBox, animationList, sortCache) {
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
        
        // Meshes
        this.divisionMeshes = [];
    }

    var animations = {
        bruteforceCreateLine: function(closestStruct){
            closestStruct.line = visualisations.vectors2Line(closestStruct.pair);
            closestStruct.line.material.color.setHex(0xaaaa00);
        },
        bruteforceAddPairs: function(closestStructs, animationList){
            animationList.addAnimation(new visualisations.AnimationList.Animation(
                /*construct*/ function(g){
                    for(var i = 0;i < closestStructs.length;i++){
                        g.add(closestStructs[i].line);
                    }
                },
                /*destruct*/ function(g){
                    for(var i = 0;i < closestStructs.length;i++){
                        g.remove(closestStructs[i].line);
                    }
                }
            ));
        },
        bruteforcePickClosest: function(closestStructs, closest, animationList){
            animationList.addAnimation(new visualisations.AnimationList.Animation(
                /*construct*/ function(g){
                    closest.line.material.color.setHex(0x00ff00);
                },
                /*destruct*/ function(g){
                    closest.line.material.color.setHex(0xaaaa00);
                }
            ));
        },
        bruteforceDestroyClosestLines: function(closestArray, closest, animationList){
            animationList.addAnimation(new visualisations.AnimationList.Animation(
                /*construct*/ function(g){
                    for(var i = 0;i < closestArray.length;i++){
                        console.log(closestArray[i]);
                        if(closestArray[i].line.uuid == closest.line.uuid){
                            continue;
                        }
                        g.remove(closestArray[i].line);
                    }
                },
                /*destruct*/ function(g){
                    for(var i = 0;i < closestArray.length;i++){
                        if(closestArray[i].line.uuid == closest.line.uuid){
                            continue;
                        }
                        g.add(closestArray[i].line);
                    }
                }
            ));
        },
        
        // Closest pair bruteforce animations
        bruteforceAddPair: function(closestStruct, animationList){
            closestStruct.line = visualisations.vectors2Line(closestStruct.pair);
            closestStruct.line.material.color.setHex(0xaaaa00);
            
            animationList.addAnimation(new visualisations.AnimationList.Animation(
                /*construct*/ function(g){
                    g.add(closestStruct.line);
                    console.log(g);
                    console.log(closestStruct);
                },
                /*destruct*/ function(g){
                    g.remove(closestStruct.line);
                }
            ));
        },
        bruteforceSwapClosestLines: function(prevClosest, nextClosest, animationList){
            // Assume nextClosest.dist < prevClosest.line
            
            var prevLine = prevClosest.line;
            var nextLine = nextClosest.line;
            
            animationList.addAnimation(new visualisations.AnimationList.Animation(
                /*construct*/ function(g){
                    prevLine.material.color.setHex(0xaaaa00);
                    nextLine.material.color.setHex(0x00ff00);
                },
                /*destruct*/ function(g){
                    nextLine.material.color.setHex(0xaaaa00);
                    prevLine.material.color.setHex(0x00ff00);
                }
            ));
        },
        partitionPoints: function(context){
            var colours = [0x9e190f, 0x152c6a];//[0xff0000, 0x0000ff];
            var colourCache = {};
            
            // Make meshes for bounding boxes
            context.divisionMeshes.push(visualisations.boundingBox2Mesh(context.boundingBoxes[0], colours[0]));
            context.divisionMeshes.push(visualisations.boundingBox2Mesh(context.boundingBoxes[1], colours[1]));
        
            var construct = function(g){
                g.add(context.divisionMeshes[0]);
                g.add(context.divisionMeshes[1]);
                for(var i = 0;i < 2;i++){
                    for(var j = 0;j < context.partitionedPoints[i].length;j++){
                        colourCache[context.partitionedPoints[i][j].ptr.uuid] = context.partitionedPoints[i][j].ptr.material.color.getHex();
                        context.partitionedPoints[i][j].ptr.material.color.setHex(colours[i]);
                    }
                }
            };
            
            var destruct = function(g){
                g.remove(context.divisionMeshes[0]);
                g.remove(context.divisionMeshes[1]);
                for(var i = 0;i < 2;i++){
                    for(var j = 0;j < context.partitionedPoints[i].length;j++){
                        context.partitionedPoints[i][j].ptr.material.color.setHex(colourCache[context.partitionedPoints[i][j].ptr.uuid]);
                    }
                }
            };
            
            context.animationList.addAnimation(new visualisations.AnimationList.Animation(construct, destruct));
        },
        togglePartitionBoxes: function(indices, context){
            var on = false;
            context.animationList.addAnimation(new visualisations.AnimationList.Animation(
                /*construct*/ function(g){
                    if(!on){on = true;}else{return;}
                    for(var i = 0;i < indices.length;i++){
                        if(g.children.indexOf(context.divisionMeshes[indices[i]]) > -1){
                            g.remove(context.divisionMeshes[indices[i]]);
                        }else{
                            g.add(context.divisionMeshes[indices[i]]);
                        }
                    }
                },
                /*destruct*/ function(g){
                    if(on){on = false;}else{return;}
                    for(var i = 0;i < indices.length;i++){
                        if(g.children.indexOf(context.divisionMeshes[indices[i]]) == -1){
                            g.add(context.divisionMeshes[indices[i]]);
                        }else{
                            g.remove(context.divisionMeshes[indices[i]]);
                        }
                    }
                }
            ));
        },
        
        middleAddPair: function(closestStruct, context){
            if(closestStruct.distance == Number.POSITIVE_INFINITY){
                console.log("Error");
                console.log(closestStruct);
                return;
            }
            animations.bruteforceAddPair(closestStruct, context.animationList);
            closestStruct.line.material.color.setHex(0x00ff00);
        },
        
        filterClosest: function(closestArray, context){
            animations.bruteforceDestroyClosestLines(closestArray, context.closest, context.animationList);
        },
        
        pickClosest: function(a, b, animationList){
            /**
             *  Assume a.distance < b.distance
            **/
            var colour = [0xffff00, 0x00ff00];
            var lines = [a.line, b.line];
            
            // Change colour to yellow
            animationList.addAnimation(new visualisations.AnimationList.Animation(
                function(g){
                    lines[0].material.color.setHex(colour[0]);
                    lines[1].material.color.setHex(colour[0]);
                },
                function(g){
                    lines[0].material.color.setHex(colour[1]);
                    lines[1].material.color.setHex(colour[1]);
                }
            ));
            // Change colour of shortest back to green, and remove the larger pair
            animationList.addAnimation(new visualisations.AnimationList.Animation(
                function(g){console.log(lines);
                    lines[0].material.color.setHex(colour[1]);
                    g.remove(lines[1]);
                },
                function(g){console.log(lines);
                    lines[0].material.color.setHex(colour[0]);
                    g.add(lines[1]);
                }
            ));
        },
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

    function findPairBruteforce(points, boundingBox, animationList){
        /** (array of THREE.Vector3, THREE.Box3, visualisations.AnimationList) -> 
         *  Find the pair of points with the smallest distance, max 3 points
         *  O(1) time
        **/
        var findClosest = function(points, i, j) {
            /** (Objects, array of THREE.Vector3, integer, integer) -> null
             * 
            **/
            // Create a temporary structure
            var closestStruct = {
                pair: [points[i], points[j]],
                distance: points[i].distanceTo(points[j]),
                line: null
            };
            animations.bruteforceCreateLine(closestStruct);
            return closestStruct;
        };
        
        // Declare default
        var closest = null;
        var closestArray = [];
        
        // Bound check in case >= 2 points
        if(points.length > 1) {
            closestArray.push(findClosest(points, 0, 1));
        }
        // Bound check in case = 3 points
        if(points.length == 3) {
            closestArray.push(findClosest(points, 0, 2));
            closestArray.push(findClosest(points, 1, 2));
        }
        
        closest = closestArray[0];
        for(var i = 1;i < closestArray.length;i++){
            if(closestArray[i].distance < closest.distance){
                closest = closestArray[i];
            }
        }
        
        animations.bruteforceAddPairs(closestArray, animationList);
        animations.bruteforcePickClosest(closestArray, closest, animationList);
        animations.bruteforceDestroyClosestLines(closestArray, closest, animationList);
        
        // Return closest point
        return closest;
    }
    
    function partitionPoints(context) {
        /** (FindPairContext) -> null
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
        // Bind animation
        animations.partitionPoints(context);
    }
    
    function partitionMiddlePoints(context) {
        /** (FindPairContext) -> null
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
        
        /*for(var i = 0;i < context.middlePoints[0].length;i++) {
            for(var j = 0;j < context.middlePoints[1].length;j++) {
                //console.log([context.middlePoints[0][i].uuid, context.middlePoints[1][j].uuid]);
                if(context.middlePoints[0][i].uuid === context.middlePoints[1][j].uuid) {
                    console.log(context.middleBoxes);
                    console.log(context.middlePoints[0][i]);
                    console.log("Closest distance:" + context.closest.distance);
                    console.log("Median:" + context.median);
                    console.log("Division Axis:" + context.divisionAxis);
                    //throw "Point in both lists";
                }
            }
        }*/
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
            var result = {pair: null, distance: Number.POSITIVE_INFINITY,};
            try {
                result = {
                    pair: [a, b],
                    distance: a.distanceTo(b),
                };
            } catch(err) { 
            }
            // Quick fix to make sure points do not end up being compared with themselves
            if(result.pair !== null && (result.pair[0].ptr.uuid == result.pair[1].ptr.uuid)){
                result.distance = Number.POSITIVE_INFINITY;
                console.log(result.pair[0].ptr.uuid + " == " + result.pair[1].ptr.uuid);
            }
            return result;
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
        var context = new FindPairContext(points, boundingBox, animationList, sortCache);
        
        // Partition points
        // ANIMATION DONE
        partitionPoints(context);
        
        // Recursively solve problem
        // ANIMATION IN PROGRESS
        // -> remove divisionMeshes
        var division = [0, 0];
        animations.togglePartitionBoxes([0, 1], context);
        division[0] = findPair(context.partitionedPoints[0], context.boundingBoxes[0], animationList, sortCache);
        division[1] = findPair(context.partitionedPoints[1], context.boundingBoxes[1], animationList, sortCache);
        animations.togglePartitionBoxes([0, 1], context);
        
        // Find the closer pair
        var indexOfClosest = division[0].distance < division[1].distance ? 0 : 1;
        context.closest = division[indexOfClosest];
        //animations.pickClosest(division[indexOfClosest], division[indexOfClosest === 0 ? 1 : 0], animationList);
        
        // Partition middle points
        partitionMiddlePoints(context);
        
        // Find points with minimum distance in the middle section
        var middleClosest = findMiddlePair(context.middlePoints, context.divisionAxis, animationList);
        animations.middleAddPair(middleClosest, context);
        division[2] = middleClosest;
        
        // Find the closest points
        indexOfClosest = division[2].distance < division[indexOfClosest].distance ? 2 : indexOfClosest;
        context.closest = division[indexOfClosest];
        animations.filterClosest(division, context);
        
        animations.togglePartitionBoxes([0, 1], context);
        
        // Return closer pair
        return context.closest;//.distance < middleClosest.distance ? context.closest : middleClosest;
    }

    function setup(canvas, numPoints, boundingBox, rotate) {
        /** (string, integer, THREE.Box3, bool) -> Null
         * 
        **/
        console.log(rotate);
        if(rotate === undefined){rotate = true;}console.log(rotate);
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
            //vector.uuid = point.uuid;
            vector.ptr = point;
            vectors.push(vector);
            points.push(point);
            box.add(point);
        }
        
        // Initialize graphics
        var g = visualisations.threeSetup(canvas);
        
        // Create box and directional lines
        g.scene.add(box);
        
        // Redraw function
        g.redraw = function(){};
        if(rotate){console.log("rotate");
            g.redraw = function (){
                box.rotation.y += 0.01;
                g.renderer.render(g.scene, g.camera);
                visualisations.requestAnimationFrame(redraw);
            }
        }else{
            g.redraw = function (){
                g.renderer.render(g.scene, g.camera);
                visualisations.requestAnimationFrame(redraw);
            }
        }
        g.redraw();
        
        var pointCache = new PointList(vectors);
        var animationList = new visualisations.AnimationList();
        var result = findPair(vectors, boundingBox, animationList, pointCache);
        
        // TODO: Have a register/subscribe method to AnimationList for this
        box.add(animationList.g);
        
        return {
            g: g,
            al: animationList,
            
            vectors: vectors,
            points: points,
            
            res: result,
        };
    }
    
    function makeButtons(animationList, elementTag){
        var $el = jQuery(elementTag);
        
        var buttonsData = [
            ["<<", "backward", function(){animationList.previousAnimation();}],
            [">>", "forward", function(){animationList.nextAnimation();}],
            [">", "continousPlay", function(){
                var $this = jQuery(this);
                animationList.finishCallback = function(){
                        $this.text(">");
                        animationList.playing = false;
                };
                switch($this.text()){
                    case ">": // Curently not playing
                        $this.text("||");
                        animationList.nextAnimationLoop();
                        break;
                    case "||": // Currently not playing
                    default: // Weird state
                        animationList.finishCallback();
                        break;
                }
            }],
        ];
        var buttons = {};
        
        for(var i = 0;i < buttonsData.length;i++){
            buttons[buttonsData[i][1]] = jQuery("<button/>", {
                text: buttonsData[i][0],
                id: buttonsData[i][1],
                click: buttonsData[i][2],
            });
        }
        
        $el.append(buttons["backward"]).append(buttons["forward"]).append("<br />");
        $el.append(buttons["continousPlay"]);
    }
    
    function init3D(canvas, points, size) {
        return setup(
            canvas,
            points,
            new THREE.Box3(
                new THREE.Vector3(-size, -size, -size),
                new THREE.Vector3( size,  size,  size)
            )
        );
    }
    
    function init2D(canvas, points, size) {
        return setup(
            canvas,
            points,
            new THREE.Box3(
                new THREE.Vector3(-size, -size, 0.),
                new THREE.Vector3( size,  size, 0.)
            ),
            false
        );
    }

    return {
        init2D: init2D,
        init3D: init3D,
        findPair: findPair,
        
        makeButtons: makeButtons,
    };
})();
