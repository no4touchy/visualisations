window.ClosestPair = (function(){
    var POINT_SIZE = 0.3;
    
    var DivisionNode = function(boundingBox, points, closestPair, minimumDistance, divisionAxis){
        /** (THREE.Box3, array of THREE.Vector3[, array of 2 THREE.Vector3, float, integer]) -> ClosestPair.DivisionNode
         *  Create a new `ClosestPair.DivisionNode`.
         */
        if(closestPair === undefined){closestPair = null;}
        if(minimumDistance === undefined){minimumDistance = Number.POSITIVE_INFINITY;}
        if(divisionAxis === undefined){divisionAxis = -1;}
        
        // Node properties
        this.parent = null;
        this.children = [null, null];
        
        this.box = boundingBox;
        this.points = points;
        
        this.closestPair = closestPair;
        this.minimumDistance = minimumDistance;
        this.divisionAxis = divisionAxis;
        this.middle = {points: null, distance: Number.POSITIVE_INFINITY,};
        
        /* FOR DEBUG PURPOSES */
        this.median = null;
    };
    DivisionNode.prototype.addChild = function(node, index){
        /** (ClosestPair.DivisionNode[, integer]) -> null
         *  Add a child to the current node, index is optional.
         */
        if(index === undefined){
            index = 0;
        }
        this.children[index] = node;
        node.parent = this;
    };
    
    var DivisionTree = function(root){
        /** (ClosestPair.DivisionNode) -> ClosestPair.DivisioTree
         *  Creates a new `ClosestPair.DivisionTree` object rooted at the node provided.
         */
        this.root = root;
        this.points = null; // Holds THREE.Mesh objects
        this.animationQueue = new visualisations.ActivityQueue();
        this.minimumLines = new THREE.Object3D();
    };
    DivisionTree.prototype.colors = {
        unselected:     0x000000,
        selected:       {point:  0x086e23, line: 0x2a7f41}, // Points, line
        out:            {active: 0x151767, idle: 0x941a0b}, // Active, Idle child
        middle:         {active: 0x333577, idle: 0xaa4639}, // Active, Idle child
        line:           {active: 0x050857, idle: 0x7d0f00, middle: 0x94710b}, // Active, Idle, middle
        
    };
    DivisionTree.prototype.buildAnimations = function(){
        var self = this;
        var recFunc = function(node, level){
            if(node.children[0] === null){
                // Highlight data
                self.animationQueue.enqueue(function(data){
                    jQuery.each(data.node.points, function(i, point){
                        data.self.points[point.uuid].material.color.setHex(
                            data.self.colors.out.active
                        );
                    });
                    data.node.tmpLine = null;
                    if(data.node.closestPair !== null){
                        data.node.tmpLine = ClosestPair.vector2Line(data.node.closestPair);
                        data.node.tmpLine.dist = data.node.minimumDistance;
                        data.node.tmpLine.material.color.setHex(
                            data.self.colors.line.active
                        );
                        data.self.minimumLines.add(data.node.tmpLine);
                    }
                }, {"self": self, "node": node, "level": level});
                // Check if we need to deinit node
                var deinit = true;
                if(node.parent !== null){
                    if(node.parent.children[1] === node){
                        deinit = false;
                    }
                }
                // Make inactive if not second child
                if(deinit){
                    self.animationQueue.enqueue(function(data){
                        jQuery.each(data.node.points, function(i, point){
                            data.self.points[point.uuid].material.color.setHex(
                                data.self.colors.out.idle
                            );
                        });
                        if(data.node.points.closestPair !== null){
                            data.node.tmpLine.material.color.setHex(
                                data.self.colors.line.idle
                            );
                        }
                    }, {"self": self, "node": node, "level": level});
                }
                return;
            }else{
                recFunc(node.children[0], level + 1);
                recFunc(node.children[1], level + 1);
                // Differentiate the middle points
                self.animationQueue.enqueue(function(data){
                    jQuery.each(data.node.middle.allPoints[0], function(i, point){
                        data.self.points[point.uuid].material.color.setHex(
                            data.self.colors.middle.idle
                        );
                    });
                    jQuery.each(data.node.middle.allPoints[1], function(i, point){
                        data.self.points[point.uuid].material.color.setHex(
                            data.self.colors.middle.active
                        );
                    });
                    data.node.tmpLine = null;
                    if(data.node.middle.points !== null){
                        data.node.tmpLine = ClosestPair.vector2Line(data.node.middle.points);
                        data.node.tmpLine.dist = data.node.middle.distance;
                        data.node.tmpLine.material.color.setHex(
                            data.self.colors.line.active
                        );
                        data.self.minimumLines.add(data.node.tmpLine);
                    }
                }, {"self": self, "node": node, "level": level});
                self.animationQueue.enqueue(function(data){
                    var lines = [],
                        minLine = {material: null, dist: Number.POSITIVE_INFINITY};
                    if(data.node.tmpLine !== null){
                        lines.push(data.node.tmpLine);
                    }
                    for(var i = 0;i < 2;i++){
                        if(data.node.children[i].tmpLine !== null){
                            lines.push(data.node.children[i].tmpLine);
                        }
                    }
                    jQuery.each(lines, function(i, line){
                        if(line !== null){
                            if(line.dist < minLine.dist){
                                minLine = line;
                            }
                            data.self.minimumLines.remove(line);
                        }
                    });
                    if(minLine.material !== null){
                        data.self.minimumLines.add(minLine);
                        minLine.material.color.setHex(
                            data.self.colors.line.idle
                        );
                    }
                    data.node.tmpLine = minLine;
                    
                    jQuery.each(data.node.points, function(i, point){
                        data.self.points[point.uuid].material.color.setHex(
                            data.self.colors.out.idle
                        );
                    });
                }, {"self": self, "node": node, "level": level});
                // Pick one line, erase others
                // Draw all points in node in same color
            }
        };
        recFunc(self.root, 0);
        self.animationQueue.enqueue(function(data){
            data.self.minimumLines.children[0].material.color.setHex(
                data.self.colors.selected.line
            );
            jQuery.each(data.self.root.closestPair, function(i, point){
                data.self.points[point.uuid].material.color.setHex(
                    data.self.colors.selected.point
                );
            });
        }, {"self": self,});
    };
    
    var ClosestPair = {
        // Some constants
        point: {
            geometry: new THREE.BoxGeometry(POINT_SIZE, POINT_SIZE, POINT_SIZE),
            material: new THREE.MeshBasicMaterial({color: 0x000000}),
        },
        line: {
            material: new THREE.LineBasicMaterial({color: 0x0000ff}),
        },
        // Some objexts
        DivisionTree: DivisionTree,
        DivisionNode: DivisionNode,
        // Some helper functions
        vector2Line: function(vectors){
            /** (array of 2 THREE.Vector3) -> THREE.Line
             *  Creates a line from a list of 2 vectors.
             */
            var geometry = new THREE.Geometry();
            geometry.vertices = vectors;
            return new THREE.Line(geometry, ClosestPair.line.material.clone());
        },
        vector2Point: function(vector){
            /** (THREE.Vector3) -> THREE.Mesh
             *  Creates a point centered at `vector`.
             */
            var mesh = new THREE.Mesh(ClosestPair.point.geometry, ClosestPair.point.material.clone());
            mesh.position = vector;
            return mesh;
        },
        box2Mesh: function(box){
            /** (THREE.Box3) -> THREE.Mesh
             *  Creates a new mesh that outlines the bounding box.
             */
            var width  = Math.abs(box.max.x - box.min.x),
                height = Math.abs(box.max.y - box.min.y),
                depth  = Math.abs(box.max.z - box.min.z);
            var center = new THREE.Vector3(
                Math.min(box.max.x, box.min.x) + width / 2,
                Math.min(box.max.y, box.min.y) + height / 2,
                Math.min(box.max.z, box.min.z) + depth / 2
            );
            var mesh = new THREE.Mesh(
                new THREE.BoxGeometry(width, height, depth),
                new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    wireframe: true,
                })
            );
            mesh.position = center;
            return mesh;
        },
        // The algorithm follows
        findMaxAxis: function(box, excludeAxis){
            /** (THREE.Box3[, integer]) -> integer
             *  Fix axis with largest dimensions, ignoring some axis
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
            /* --- Find axis with spanning size --- */
            return dim.indexOf(Math.max.apply(Math, dim));
        },
        findMiddlePair: function(points, axis){
            /** (array of array of THREE.Vector3, integer) -> {points, distance}
             *  Finds the closest pair of points inside the middle partition.
             */
            var sortFunc = function(a, b){
                return a.getComponent(axis) - b.getComponent(axis);
            };
            var analyzePoints = function(a, b){
                try{
                    return {
                        points: [a, b],
                        distance: a.distanceTo(b),
                    };
                }catch(err){
                    return {points: null, distance: Number.POSITIVE_INFINITY,};
                }
            };
            var comparePoints = function(a, b){
                return a.distance < b.distance ? a : b;
            };
            var sortedPoints = [
                points[0].sort(sortFunc),
                points[1].sort(sortFunc),
            ];
            var closest = {points: null, distance: Number.POSITIVE_INFINITY,};
            var i = 0, j = 0, m = Math.min(sortedPoints[0].length, sortedPoints[1].length);
            while(i < m && j < m){
                var current = analyzePoints(sortedPoints[0][i], sortedPoints[1][j]), next;
                if(sortedPoints[0][i].getComponent(axis) > sortedPoints[1][j].getComponent(axis)){
                    next = analyzePoints(sortedPoints[0][i], sortedPoints[1][j + 1]);
                    i++;
                }else{
                    next = analyzePoints(sortedPoints[0][i + 1], sortedPoints[1][j]);
                    j++;
                }
                closest = comparePoints(closest, comparePoints(current, next));
            }
            return closest;
        },
        findPair: function(points, boundingBox){
            /** (array of THREE.Vector3, THREE.Box3) -> ClosestPair.DivisionNode
             *  Find the smallest 
             */
            /* --- 1 or less points --- */
            if(points.length < 2){
                return new ClosestPair.DivisionNode(
                    boundingBox,                // BoundingBox
                    points,                     // Return the points
                    null,                       // Closest pair
                    Number.POSITIVE_INFINITY,   // Distance
                    -1                          // No axis of division
                );
            }
            /* --- Exactly 2 points --- */
            if(points.length == 2){
                return new ClosestPair.DivisionNode(
                    boundingBox,                        // BoundingBox
                    points,                             // Return the points
                    points,                             // Closest pair
                    points[0].distanceTo(points[1]),    // Distance
                    -1                                  // No axis of division
                );
            }
            var node = new ClosestPair.DivisionNode(boundingBox, points);
            /* --- Find max axis and sort boxes on that axis --- */
            node.divisionAxis = ClosestPair.findMaxAxis(boundingBox);
            var sortedPoints = points.sort(function(a, b){
                return a.getComponent(node.divisionAxis) - b.getComponent(node.divisionAxis);
            });
            /* --- Find median of sorted array --- */
            var medianIndex = sortedPoints.length / 2;
            var median = (  sortedPoints[Math.floor(medianIndex)].getComponent(node.divisionAxis) +
                            sortedPoints[Math.ceil(medianIndex)].getComponent(node.divisionAxis)) / 2;
            node.median = median;
            /* --- Find new bounding boxes --- */
            var boxes = [boundingBox.clone(), boundingBox.clone()];
            boxes[0].max.setComponent(node.divisionAxis, median);
            boxes[1].min.setComponent(node.divisionAxis, median);
            /* --- Partition points --- */
            var partionedPoints = [[], []];
            for(var i = 0;i < sortedPoints.length;i++){
                var partition = sortedPoints[i].getComponent(node.divisionAxis) < median ? 0 : 1;
                partionedPoints[partition].push(sortedPoints[i]);
            }
            /* --- Find closest points in partitions --- */
            for(var i = 0;i < 2;i++){
                node.addChild(ClosestPair.findPair(partionedPoints[i], boxes[i]), i);
            }
            /* --- Find the closer pair --- */
            var childIndex = node.children[0].minimumDistance < node.children[1].minimumDistance ? 0 : 1;
            var closest = {
                points: node.children[childIndex].closestPair,
                distance: node.children[childIndex].minimumDistance,
            };
            /* --- Handle middle partition points --- */
            var middlePoints = [[], []];
            for(var i = 0;i < 2;i++){
                for(var j = 0;j < partionedPoints[i].length;j++){
                    if(Math.abs(partionedPoints[i][j].getComponent(node.divisionAxis) - median) < closest.distance){
                        middlePoints[i].push(partionedPoints[i][j]);
                    }
                }
            }
            var middle = ClosestPair.findMiddlePair(
                middlePoints,
                ClosestPair.findMaxAxis(boundingBox, node.divisionAxis)
            );
            if(middle.distance < closest.distance){
                closest = middle;
            }
            node.closestPair = closest.points;
            node.minimumDistance = closest.distance;
            node.middle = middle;
            node.middle.allPoints = middlePoints;
            return node;
        },
        // Init function
        init: function(points, boundingBox){
            /** (array of THREE.Vector3, THREE.Box3) -> ClosestPair.DivisionNode
             *  Find the closest pair, and keep all computations in a tree.
             */
            var tree = new DivisionTree(ClosestPair.findPair(points, boundingBox));
            tree.points = {};
            for(var i = 0;i < points.length;i++){
                var point = ClosestPair.vector2Point(points[i]);
                tree.points[point.uuid] = point;
                points[i].uuid = point.uuid;
            }
            return tree;
        },
    };
    
    return ClosestPair;
})();
