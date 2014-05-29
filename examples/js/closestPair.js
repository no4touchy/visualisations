var ClosestPair = {
    findMaxAxis: function(box, excludeAxis){
        /** Finx axis with largest dimensions.
         * (Box3 [, integer]) -> integer
         */
         if(excludeAxis === undefined){
             excludeAxis = -1;
         }
        /* --- Find dimensions of bounding box --- */
        var max = box.max.toArray(),
            min = box.min.toArray();
        var dim = [];
        for(var i = 0;i < max.length;i++){
            dim.push(i != excludeAxis ? Math.abs(max[i] - min[i]) : -1);
        }
        /* --- Find axis with smalles size --- */
        return dim.indexOf(Math.max.apply(Math, dim));
    },
    boundingTreeObject: function(boundingBox, points, maxAxis){
        /** Create a BoudingTree object.
         * (Box3, array of Vector3) -> BoudingTree
         */
        return {
            "data": boundingBox,
            "points": points,
            "divisionAxis": maxAxis,
            "parent": null,
            "children": [null, null],
            "middle": null,
        };
    },
    pairObject: function(pointPair, dist, boundingTree){
        /** Create a Pair object.
         * (array of 2 Mesh, float, BoudingTree) -> Pair
         */
        return {
            "pair": pointPair,
            "dist": dist,
            "boundingTree": boundingTree,
        };
    },
    findMiddlePair: function(points, boundingBox, maxAxis){
        /**
         * (array of array of Vector3, Box3, integer) -> pair of Mesh
         */
        // TOOD: find  next max axis
        var axis = ClosestPair.findMaxAxis(boundingBox, maxAxis);
        var sFunc = function(a, b){
            return a.getComponent(axis) - b.getComponent(axis);
        }
        var sPoints = [points[0].sort(sFunc), points[1].sort(sFunc)];
        
        var closest = ClosestPair.pairObject(null, Number.POSITIVE_INFINITY, maxAxis, null);
        var i = 0, j = 0;
        while(i < sPoints[0].length && j < sPoints[1].length){
            var pair = [sPoints[0][i], sPoints[1][j]],
                dist = sPoints[0][i].distanceTo(sPoints[1][j]);
            if(sPoints[0][i].getComponent(axis) >= sPoints[1][j].getComponent(axis) && i < sPoints[0].length){
                i++;
            }else{
                j++;
            }
            if(dist < closest.dist){
                closest.dist = dist;
                closest.pair = pair;
            }
        }
        return closest;
    },
    findPair: function(points, boundingBox){
        /**
         * (array of Vector3, Box3) -> pair of Mesh
         */
        /* --- 1 or less points --- */
        if(points.length < 2){
            return ClosestPair.pairObject(
                null,
                Number.POSITIVE_INFINITY,
                ClosestPair.boundingTreeObject(boundingBox, points, -1)
            );
        }
        /* --- Exactly 2 points --- */
        if(points.length == 2){
            return ClosestPair.pairObject(
                points,
                points[0].distanceTo(points[1]),
                ClosestPair.boundingTreeObject(boundingBox, points, -1)
            );
        }
        /* --- Find max axis and sort boxes on that axis --- */
        var maxAxis = ClosestPair.findMaxAxis(boundingBox);
        var sPoints = points.sort(function(a, b){
            return a.getComponent(maxAxis) - b.getComponent(maxAxis);
        });
        /* --- Find median of sorted array --- */
        var medianIndex = sPoints.length / 2;
        var median = (  sPoints[Math.floor(medianIndex)].getComponent(maxAxis) +
                        sPoints[Math.ceil(medianIndex)].getComponent(maxAxis)) / 2;
        /* --- Find new bounding boxes --- */
        var boxes = [boundingBox.clone(), boundingBox.clone()];
        boxes[0].max.setComponent(maxAxis, median);
        boxes[1].min.setComponent(maxAxis, median);
        /* --- Partition points --- */
        var pPoints = [[], []];
        for(var i = 0;i < sPoints.length;i++){
            var partition = sPoints[i].getComponent(maxAxis) < median ? 0 : 1;
            pPoints[partition].push(sPoints[i]);
        }
        /* --- Find closest points in partition --- */
        var closestPairs  = [
            ClosestPair.findPair(pPoints[0], boxes[0]),
            ClosestPair.findPair(pPoints[1], boxes[1]),
        ];
        /* --- Find the closer pair --- */
        var closest = null;
        var newTree = ClosestPair.boundingTreeObject(boundingBox, points, maxAxis);
        if(closestPairs[0] !== null){ // First recursive call was succesfull
            newTree.children[0] = closestPairs[0].boundingTree;
            newTree.children[0].parent = newTree;
            if(closestPairs[1] !== null){ // Second recursive call was succesfull
                newTree.children[1] = closestPairs[1].boundingTree;
                newTree.children[1].parent = newTree;
                closest = closestPairs[0].dist < closestPairs[1].dist ? closestPairs[0] : closestPairs[1];
            }else{ // Only first recursive call was succesfull
                closest = closestPairs[0];
            }
        }else if(closestPairs[1] !== null){ // Only second recursive call was succesfull
            newTree.children[1] = closestPairs[1].boundingTree;
            newTree.children[1].parent = newTree;
            closest = closestPairs[1];
        }
        /* --- Find middle bounding box and middle points --- */
        var middleBox = boundingBox.clone();
        middleBox.min.setComponent(maxAxis, median - closest.dist);
        middleBox.max.setComponent(maxAxis, median + closest.dist);
        var mPoints = [[], []];
        for(var i = 0;i < pPoints.length;i++){
            for(var j = 0;j < pPoints[i].length;j++){
                if(middleBox.containsPoint(pPoints[i][j])){
                    mPoints[i].push(pPoints[i][j]);
                }
            }
        }
        /* --- Find closest pair inside the middle box, and closest pair overall --- */
        var middleClosestPair = ClosestPair.findMiddlePair(mPoints, middleBox, maxAxis);
        if(middleClosestPair.dist < closest.dist){
            newTree.middle = ClosestPair.boundingTreeObject(middleBox, mPoints[0].concat(mPoints[1]));
            newTree.middle.parent = newTree;
            closest.pair = middleClosestPair.pair;
            closest.dist = middleClosestPair.dist;
        }
        /* --- Return closest pair object --- */
        closest.divisionAxis = maxAxis;
        closest.boundingTree = newTree;
        return closest;
    },
};