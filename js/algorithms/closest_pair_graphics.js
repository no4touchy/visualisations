ClosestPair.animations = (function(){

    // Constant definintions
    var LINE_UNSELECTED_COLOUR = 0xAAAA00;
    var LINE_SELECTED_COLOUR = 0xFF9900;
    var POINT_RED = 0x9E190F;
    var POINT_BLUE = 0x152C6A;

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

    return {
        // Line creation
        addLines: function(objectCache, animationList, points, selected){
            /*  Create a line between the points
             *  ({points, lines, boxes}, visualisations.AnimationList, arrray of arrays of 2 THREE.Vector3, bool) -> null
             */
            if(selected === undefined){selected = false;}

            var lines = [];

            for(var i = 0;i < points.length;i++){
                var line = visualisations.vectors2Line(points[i]);
                line.puuid = linePUUID(points[i]);
                lines.push(line);
                objectCache.lines[line.puuid] = line;
            }

            animationList.addAnimation(new visualisations.AnimationList.Animation(
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
            ));
        },
        addLine: function(objectCache, animationList, points, selected){
            /*  Create a line between the points
             *  ({points, lines, boxes}, visualisations.AnimationList, array of 2 THREE.Vector3, bool) -> null
             */
            if(selected === undefined){selected = false;}
            return ClosestPair.animations.addLines(objectCache, animationList, [points]);
        },

        // Line highlighting
        selectLine: function(objectCache, animationList, points){
            /*  Make a line selected
             *  ({points, lines, boxes}, visualistions.AnimationList, array of 2 THREE.Vector3) -> null
             */
            var line = findLineByPUUID(objectCache, points);
            var oldColour = null;

            // Check if line if found
            if(line !== undefined){
                oldColour = line.material.color.getHex();
                animationList.addAnimation(new visualisations.AnimationList.Animation(
                    /* build */ function(g){
                        line.material.color.setHex(LINE_SELECTED_COLOUR);
                    },
                    /* destroy */ function (g){
                        line.material.color.setHex(oldColour);
                    }
                ));
            }
        },
        unselectLines: function(objectCache, animationList, points){
            /*  Make the line unselected
             *  ({points, lines, boxes}, visualistions.AnimationList, array of arrays of 2 THREE.Vector3) -> null
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

            animationList.addAnimation(new visualisations.AnimationList.Animation(
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
            ));
        }
    };
})();

