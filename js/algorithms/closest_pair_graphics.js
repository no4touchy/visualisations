ClosestPair.animations = (function(){
    /* --- Constant definintions -- */
    var LINE_UNSELECTED_COLOUR = 0xAAAA00;
    var LINE_SELECTED_COLOUR = 0xFF9900;
    var POINT_RED = 0x9E190F;
    var POINT_BLUE = 0x152C6A;

    var contextStack;
    var currentContext;
    var animationList;

    /* --- Helper functions --- */

    function graphicContext(){
        this.closestPair = [];
        this.closestLine = [];

        this.otherPairs = [];
        this.pairs = [];
        this.lines = [];
    }

    function init(points, lines, boxes){
        /*  Initialize the structures
         *  (array of THREE.Object3D, array of THREE.Object3D, array of THREE.Object3D) -> nil
         */

        contextStack = [];
        currentContext = null;
        animationList = new visualisations.AnimationList();
    }

    function linePUUID(points){
        /*  Genereate uuid of line between 2 points
         *  (array of 2 THREE.Vector3) -> string
         */
        return points[0].ptr.uuid + ":" + points[1].ptr.uuid;
    }

    function findLineByPUUID(lines, points){
        /*  Find the line using the points' uuid
         *  Returns null if line does not exist
         *  (array of THREE.Line, array of 2 THREE.Vector3) -> THREE.Line
         */
        for(var i = 0;i < 2;i++){
            var uuid = linePUUID([points[i], points[(i + 1) % 2]]);

            return _.find(lines, function (line) {
                return line.puuid == uuid;
            });
        }
    }

    /* --- Graphics functions --- */

    /* -- Line creation -- */
    function addLines(lines, selected, temporary){
        /*  Create a line between the points
         *  (arrray of arrays of 2 THREE.Vector3, bool, bool) -> null
         */
        if(selected === undefined){selected = false;}
        if(temporary === undefined){temporary = false;}

        var context = currentContext;
        var lineObjs = [];

        for(var i = 0;i < lines.length;i++){
            var line = visualisations.vectors2Line(lines[i]);
            line.material.color.setHex(selected ? LINE_SELECTED_COLOUR : LINE_UNSELECTED_COLOUR);
            line.puuid = linePUUID(lines[i]);
            lineObjs.push(line);
            if(!temporary) {
                context.lines.push(line);
            }
        }

        animationList.addAnimation(
            /* build */ function(g){
                _.forEach(lineObjs, g.add);
            },
            /* destroy */ function (g){
                _.forEach(lineObjs, g.remove);
            }
        );

        return lineObjs;
    }
    function addLine(points, selected){
        /*  Create a line between the points
         *  (array of 2 THREE.Vector3, bool) -> null
         */
        if(selected === undefined){selected = false;}
        return addLines([points], selected);
    }
    function removeLines(lines, objects){
        /*  Remove a line
         *  (arrray of arrays of 2 THREE.Vector3, array of THREE.Line) -> null
         */

        var context = currentContext;
        var lineObjs = [];
        if(objects === undefined){objects = context.lines;}

        for(var i = 0;i < lines.length;i++){
            lineObjs.push(findLineByPUUID(objects, lines[i]));
        }

        animationList.addAnimation(
            /* build */ function(g){
                _.forEach(lineObjs, g.remove);
            },
            /* destroy */ function(g){
                _.forEach(lineObjs, g.add);
            }
        );
    }
    function removeLine(points){
        /*  Create a line between the points
         *  (array of 2 THREE.Vector3, bool) -> null
         */
        return removeLines([points]);
    }
    
    /* -- Line highlighting -- */
    function selectLine(points){
        /*  Make a line selected
         *  (array of 2 THREE.Vector3) -> null
         */

        var context = currentContext;
        var line = findLineByPUUID(context.lines, points);
        var oldColour = null;

        // Check if line if found
        if(line !== undefined){
            oldColour = line.material.color.getHex();
            animationList.addAnimation(
                /* build */ function(g){
                    line.material.color.setHex(LINE_SELECTED_COLOUR);
                },
                /* destroy */ function (g){
                    line.material.color.setHex(oldColour);
                }
            );
        }

        return line;
    }
    function unselectLines(points){
        /*  Make the line unselected
         *  (array of arrays of 2 THREE.Vector3) -> null
         */

        var context = currentContext;
        var lines = [];
        var oldColours = [];

        for(var i = 0;i < points.length;i++){
            var line = findLineByPUUID(context.lines, points[i]);
            oldColours.push(line.material.color.getHex());
        }

        animationList.addAnimation(
            /* build */ function(g){
                _.forEach(lines, function(line){
                    line.material.color.setHex(LINE_UNSELECTED_COLOUR);
                });
            },
            /* destroy */ function (g){
                _.forEach(lines, function(line, i){
                    line.material.color.setHex(oldColours[i]);
                });
            }
        );
    }

    function findPairBruteforce (lines, shortestLine, badLines) {
        var context = currentContext;

        context.closestPair = shortestLine;
        context.otherPairs = badLines;
        context.pairs = lines;

        if(lines.length == 1){
            context.closestLine = addLine(shortestLine, true)[0];
        }else{
            addLines(lines);
            context.closestLine = selectLine(shortestLine);
            removeLines(badLines);
        }
    }
    function findClosestPair (closestPair, furtherPairs) {
        var context = currentContext;

        context.closestPair = closestPair;
        context.closestLine = findLineByPUUID(context.lines, closestPair);

        unselectLines(furtherPairs);
        removeLines(furtherPairs);
    }

    function findMiddlePair (closestPair, allPairs, badPairs) {
        var context = currentContext;

        var lines = addLines(allPairs, false, false);
        var closestLine = findLineByPUUID(lines, closestPair);
        context.pairs.push(closestPair);
        context.lines.push(closestLine);

        console.log(closestLine);

        if(context.closestLine == undefined){
            context.closestPair = closestPair;
            context.closestLine = closestLine;
        }else if(context.closestLine.uuid != closestLine.uuid){

            var d1 = closestLine.geometry.vertices[0].distanceTo(closestLine.geometry.vertices[1]);
            var d2 = context.closestLine.geometry.vertices[0].distanceTo(context.closestLine.geometry.vertices[1]);

            if(d1 < d2){
                badPairs.push(context.closestPair);
                lines.push(context.closestLine);

                context.closestPair = closestPair;
                context.closestLine = closestLine;
            }else{
                badPairs.push(closestPair);
            }
        }

        selectLine(closestPair);
        removeLines(badPairs, lines);
    }

    return {
        init: init,

        pushContext: function() {
            currentContext = new graphicContext();
            contextStack.push(currentContext);
        },
        popContext: function() {
            if(contextStack.length == 0){
                return;
            }
            var lastContext = contextStack.pop();

            if(contextStack.length != 0){
                currentContext = contextStack[contextStack.length - 1];
                currentContext.pairs.push(lastContext.closestPair);
                currentContext.lines.push(lastContext.closestLine);
            }else{
                currentContext = null;
            }
        },

        setAnimationList: function(aList) {
            animationList = aList;
        },
        getAnimationList: function() {
            return animationList;
        },

        addLine: addLine,
        removeLine: removeLine,

        findPairBruteforce: findPairBruteforce,
        findClosestPair: findClosestPair,
        findMiddlePair: findMiddlePair,

        showPartitionBoxes: function(partitionBoxes) {

        }
    };
})();

