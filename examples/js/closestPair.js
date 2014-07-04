var ClosestPair = (function () {
    'use strict';

    var setup = function (numPoints, boundingBox) {
        /** (integer, THREE.Box3) -> Null
         * 
         */
        // Find the length of the bounding box on each axis
        var length = new THREE.Vector3(
            Math.abs(boundingBox.max.getComponent(0) - boundingBox.min.getComponent(0)),
            Math.abs(boundingBox.max.getComponent(1) - boundingBox.min.getComponent(1)),
            Math.abs(boundingBox.max.getComponent(2) - boundingBox.min.getComponent(2))
        );
        // Generate random points inside bounding box
        var points = [], vectors = [];
        for (var i = 0;i < numPoints;i++) {
            var vector = new THREE.Vector3(
                Math.random() * length.getComponent(0) + boundingBox.min.getComponent(0),
                Math.random() * length.getComponent(1) + boundingBox.min.getComponent(1),
                Math.random() * length.getComponent(2) + boundingBox.min.getComponent(2)
            );
            var point = visualisations.vector2Point(vector);
            vector.uuid = point.uuid;
            vectors.push(vector);
            points.push(point);
        }
        
        // Initialize graphics
        var g = visualisations.threeSetup(".container");
        
        // Create box and directional lines
        var box = new THREE.Object3D();
        g.scene.add(box);
        for(var i = 0;i < 3;i++){
            var ends = [new THREE.Vector3(), new THREE.Vector3()];
            ends[1].setComponent(i, 1.0);
            box.add(visualisations.vectors2Line(
                ends,
                new THREE.LineBasicMaterial({color: 0xff << (8 * i)})
            ));
        }
        
        return {
            vectors: vectors,
            points: points,
        };
    };

    return {
        init3d: function (points, size) {
            return setup(points, new THREE.Box3(
                new THREE.Vector3(-size, -size, -size),
                new THREE.Vector3( size,  size,  size)
            ));
        },
    };
})();
