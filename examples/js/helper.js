var helper = {
    // Make sure we have requestAnimationFrame
    requestAnimationFrame: (function(){
        return  window.requestAnimationFrame        ||
                window.webkitRequestAnimationFrame  ||
                window.mozRequesstAnimationFrame    ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback){
                    window.setTimeout(callback, 1000 / 60);
                };
    })().bind(window),
    degreesToRadians: function(deg){
        return deg * 180 / 3.14159;
    },
    arrayToLine: function (arr, material){
        var geometry = new THREE.Geometry();
        jQuery.map(arr, function(item, i){
            geometry.vertices.push(item);
        });
        return new THREE.Line(geometry, material);
    },
    boundingBoxToMesh: function (box){
        var width  = Math.abs(box.max.x - box.min.x),
            height = Math.abs(box.max.y - box.min.y),
            depth  = Math.abs(box.max.z - box.min.z);
        var center = new THREE.Vector3(
            Math.min(box.max.x, box.min.x) + width / 2,
            Math.min(box.max.y, box.min.y) + height / 2,
            Math.min(box.max.z, box.min.z) + depth / 2);
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
    browseTree: function (node, array, level){
        /* --- Handle overloading --- */
        if(array === undefined){
            array = {
                "result": [],
                "counter": 0,
            };
        }
        if(level === undefined){
            level = 0;
        }
        /* --- Make sure we have a non-empty node --- */
        if(node === undefined){
            return null;
        }
        /* --- Handle current node --- */
        if(!array.result.hasOwnProperty(level)){
            array.result[level] = [];
        }
        var obj = {
            "id": array.counter,
            "points": node.points,
            "box": helper.boundingBoxToMesh(node.data),
            "boundingBox": node.data,
            "label": null,
        }
        
        array.counter++;
        
        /* --- Get label and push object --- */
        if(node.parent === null){
            obj.label = "Root";
           }else{
            var labels = [
               ["Left", "Right"],
               ["Bottom", "Top"],
                ["Back", "Forward"],
            ][node.parent.divisionAxis];
            for(var i = 0;i < labels.length;i++){
                if(node.parent.children[i] === node){
                    obj.label = labels[i];
                    break;
                }
            }
        }
        array.result[level].push(obj);
        
        /* --- Handle children --- */
        for(var i = 0;i < node.children.length;i++){
            if(node.children[i] !== null){
                helper.browseTree(node.children[i], array, level + 1);
            }
        }
        return array.result;
    },
};