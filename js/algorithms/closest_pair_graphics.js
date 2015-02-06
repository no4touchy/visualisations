ClosestPair.animations = (function(){
    /* --- Constant definintions -- */
    var LINE_UNSELECTED_COLOUR = 0xAAAA00;
    var LINE_SELECTED_COLOUR = 0xFF9900;
    var POINT_RED = 0x9E190F;
    var POINT_BLUE = 0x152C6A;

    var objectCache;

    /* --- Helper functions --- */

    function initCache(points, lines, boxes){
        /*  Initialize the object cache.
         *  (array of THREE.Object3D, array of THREE.Object3D, array of THREE.Object3D) -> nil
         */
        objectCache = {
            points: points,
            lines: lines,
            boxes: boxes
        }
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
    function addLines(animationList, points, selected){
        /*  Create a line between the points
         *  (visualisations.AnimationList, arrray of arrays of 2 THREE.Vector3, bool) -> null
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
    function removeLines(animationList, lines){
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
    function addLine(animationList, points, selected){
        /*  Create a line between the points
         *  (visualisations.AnimationList, array of 2 THREE.Vector3, bool) -> null
         */
        if(selected === undefined){selected = false;}
        return addLines(animationList, [points], selected);
    }
    
    /* -- Line highlighting -- */
    function selectLine(animationList, points){
        /*  Make a line selected
         *  (visualistions.AnimationList, array of 2 THREE.Vector3) -> null
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
    function unselectLines(animationList, points){
        /*  Make the line unselected
         *  (visualistions.AnimationList, array of arrays of 2 THREE.Vector3) -> null
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
        initCache: initCache,

        addLine: addLine,

        findPairBruteforce: function(animationList, lines, shortestLine, badLines){
            if(lines.length == 1){
                addLine(animationList, shortestLine, true);
            }else{
                addLines(animationList, lines);
                selectLine(animationList, shortestLine);
                removeLines(animationList, badLines);
            }
        },
    };
})();

