ClosestPair.animations = (function(){
    /* --- Constant definintions -- */
    var LINE_UNSELECTED_COLOUR = 0xAAAA00;
    var LINE_SELECTED_COLOUR = 0xFF9900;
    var POINT_RED = 0x9E190F;
    var POINT_BLUE = 0x152C6A;

    var objectCache;
    var animationList;

    /* --- Helper functions --- */

    function init(points, lines, boxes){
        /*  Initialize the object cache.
         *  (array of THREE.Object3D, array of THREE.Object3D, array of THREE.Object3D) -> nil
         */
        objectCache = {
            points: points,
            lines: lines,
            boxes: boxes
        };

        animationList = new visualisations.AnimationList();
    }

    function linePUUID(points){
        /*  Genereate uuid of line between 2 points
         *  (array of 2 THREE.Vector3) -> string
         */
        return points[0].ptr.uuid + ":" + points[1].ptr.uuid;
    }

    function findLineByPUUID(objectCache, points){
        /*  Find the line using the points' uuid
         *  Returns null if line does not exist
         *  ({points, lines, boxes}, array of 2 THREE.Vector3) -> THREE.Line
         */
        for(var i = 0;i < 2;i++){
            var uuid = linePUUID([points[i], points[(i + 1) % 2]]);
            var line = objectCache.lines[uuid];
            if(line !== undefined){
                return line;
            }
        }
    }

    /* --- Graphics functions --- */

    /* -- Line creation -- */
    function addLines(points, selected){
        /*  Create a line between the points
         *  (arrray of arrays of 2 THREE.Vector3, bool) -> null
         */
        if(selected === undefined){selected = false;}

        var lines = [];

        for(var i = 0;i < points.length;i++){
            var line = visualisations.vectors2Line(points[i]);
            line.material.color.setHex(selected ? LINE_SELECTED_COLOUR : LINE_UNSELECTED_COLOUR);
            line.puuid = linePUUID(points[i]);
            lines.push(line);
            objectCache.lines[line.puuid] = line;
        }

        animationList.addAnimation(
            /* build */ function(g){
                for(var i = 0;i < lines.length;i++){
                    g.add(lines[i]);
                }
            },
            /* destroy */ function (g){
                for(var i = 0;i < lines.length;i++){
                    g.remove(lines[i]);
                }
            }
        );
    }
    function addLine(points, selected){
        /*  Create a line between the points
         *  (array of 2 THREE.Vector3, bool) -> null
         */
        if(selected === undefined){selected = false;}
        return addLines([points], selected);
    }
    function removeLines(lines){
        /*  Remove a line
         *  (arrray of arrays of 2 THREE.Vector3, bool) -> null
         */
        var lineIDs = [];

        for(var i = 0;i < lines.length;i++){
            lineIDs.push(findLineByPUUID(objectCache, lines[i]));
        }

        animationList.addAnimation(
            /* build */ function(g){
                for(var i = 0;i < lineIDs.length;i++){
                    g.remove(lineIDs[i]);
                }
            },
            /* destroy */ function(g){
                for(var i = 0;i < lineIDs.length;i++){
                    g.add(lineIDs[i]);
                }
            }
        );
    }
    function removeLine(points, selected){
        /*  Create a line between the points
         *  (array of 2 THREE.Vector3, bool) -> null
         */
        if(selected === undefined){selected = false;}
        return removeLines([points], selected);
    }
    
    /* -- Line highlighting -- */
    function selectLine(points){
        /*  Make a line selected
         *  (array of 2 THREE.Vector3) -> null
         */
        var line = findLineByPUUID(objectCache, points);
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
    }
    function unselectLines(points){
        /*  Make the line unselected
         *  (array of arrays of 2 THREE.Vector3) -> null
         */
        var lines = [];
        var oldColours = [];

        for(var i = 0;i < points.length;i++){
            var line = findLineByPUUID(points[i]);
            if(line !== undefined){
                lines.push(line);
                oldColours.push(line.material.color.getHex());
            }
        }

        animationList.addAnimation(
            /* build */ function(g){
                for(var i = 0;i < lines.length;i++){
                    lines[i].material.color.setHex(LINE_UNSELECTED_COLOUR);
                }
            },
            /* destroy */ function (g){
                for(var i = 0;i < lines.length;i++){
                    lines[i].material.color.setHex(oldColours[i]);
                }
            }
        );
    }

    return {
        init: init,

        setAnimationList: function(aList) {
            animationList = aList;
        },

        getAnimationList: function() {
            return animationList;
        },



        addLine: addLine,

        removeLine: removeLine,

        findPairBruteforce: function(lines, shortestLine, badLines) {
            if(lines.length == 1){
                addLine(shortestLine, true);
            }else{
                addLines(lines);
                selectLine(shortestLine);
                removeLines(badLines);
            }
        },

        showPartitionBoxes: function(partitionBoxes) {

        }
    };
})();

