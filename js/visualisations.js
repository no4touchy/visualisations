window.visualisations = (function () {
    
    var POINT_SIZE = 0.3;
    var POINT_GEOMETRY = new THREE.BoxGeometry(POINT_SIZE, POINT_SIZE, POINT_SIZE);
    
    function ActivityQueue () {
        this.head = null;
        this.tail = null;
        this.current = null;
        
        this.play = false;
        this.timeout = 800;
        this.resetFunc = function(){};
    }
    ActivityQueue.prototype = {
        constructor: ActivityQueue,
        enqueue: function (func, data) {
            var obj = {
                func: func,
                data: data,
                prev: null,
                next: null,
            };
            if(this.tail === null){
                this.head = obj;
                this.tail = obj;
            }else{
                this.tail.next = obj;
                obj.prev = this.tail;
                this.tail = obj;
            }
        },
        dequeue: function () {
            var result = null;
            if(this.head === null){
                throw "No items in ActivityQueue!";
            }
            if(this.head.next === null){
                result = this.head;
                this.head = null;
                this.tail = null;
            }else{
                result = this.head;
                this.head = this.head.next;
                result.next = null;
                this.head.prev = null;
            }
            return result;
        },
        reset: function () {
            this.current = this.head;
            this.play = false;
            window.setTimeout(this.resetFunc, 500);
        },
        executeSingle: function () {
            var obj = {func:function(data){return;},data:null,};
            if(this.current === null){
                this.current = this.head;
            }
            if(this.current !== null){
                obj = this.current;
                this.current = obj.next;
            }
            return obj.func(obj.data);
        },
        executeContinous: function () {
            var that = this;
            this.play = true;
            var func = function(){
                if(that.play){
                    try{
                        that.executeSingle();
                    }catch(err){
                        return err;
                    }
                    window.setTimeout(func, that.timeout);
                }
            };
            func();
        },
    };
    
    function AnimationList () {
        /** () -> visualisations.AnimationList
         *  Constructs a new animation queue
         *  O(1) time
         */
        // Set end nodes
        this.startNode = AnimationList.Node("empty");
        this.endNode = AnimationList.Node("empty");
        this.startNode.next = this.endNode;
        this.endNode.previous = this.startNode;
        // Flow controls
        this.start = this.startNode;
        this.current = this.startNode;
        this.play = false;
        this.timeout = {
            start: 800,
            middle: 800,
            end: 800,
            empty: 0
        };
    }
    
    AnimationList.noop = function () {};
    AnimationList.Node = function (timeoutName, forward, backward, next, previous) {
        /** (string, [function[, function[, visualisations.AnimationList.Node[, visualisations.AnimationList.Node]]]]) -> visualisations.AnimationList.Node
         *  Builds a storage node
         *  O(1) time
         */
        this.forward = forward !== undefined ? forward : AnimationList.noop;
        this.backward = backward !== undefined ? backward : AnimationList.noop;
        this.next = next !== undefined ? next : null;
        this.previous = previous !== undefined ? previous : null;
        this.timeout = timeoutName;
        this.parent = null;
    },
    AnimationList.prototype = {
        constructor: AnimationList,
        addNode: function (node) {
            /** (visualisations.AnimationList.Node) -> null
             *  Add new animation node to list
             *  O(1) time
             */
            var end = this.endNode.prev;
            node.parent = this;
            end.next = node;
            node.prev = end;
            this.endNode.prev = node;
            node.next = this.endNode;
        },
        playForward: function () {
            /** () -> ???
             *  Play a single animation forward sequence
             *  O(1) time
             */
            if (this.end == this.current) {
                return;
            }
            this.current = this.current.next;
            return this.current.prev.forward();
        },
        playBackward: function () {
            /** () -> ???
             *  Play a single animation backward sequence
             *  O(1) time
             */
            if (this.start == this.current) {
                return;
            }
            this.current = this.current.prev;
            return this.current.next.backward();
        },
        playForwardContinous: function () {
            /** () -> null
             *  Play through all the forward animation
             *  O(n) time
             */
            var that = this;
            window.setTimeout(function () {
                if (that.play) {
                    that.playForward();
                    that.playForwardContinous();
                }
            }, this.timeout[this.current.timeout]);
        },
        playBackwardContinous: function () {
            /** () -> null
             *  Play through all the backward animation
             *  O(n) time
             */
            var that = this;
            window.setTimeout(function () {
                if (that.play) {
                    that.playBackward();
                    that.playBackwardContinous();
                }
            }, this.timeout[this.current.timeout]);
        },
    };
    
    function threeSetup (selector) {
        /** (string) -> Object containing THREE.js constructs
         *  Builds a THREE.js context at `selector`,
         *  O(1) time
         */
        var $el = jQuery(selector);
        var WIDTH = $el.width(),
            HEIGHT = $el.height();
        /* --- ThreeJS setup --- */    
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(75., WIDTH / HEIGHT, 0.1, 1000.);
        var renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        camera.position.z = 30;
        renderer.setSize(WIDTH, HEIGHT);
        $el.append(renderer.domElement);
        
        return {
            scene: scene,
            camera: camera,
            renderer: renderer,
        };
    }
    
    var requestAnimationFrame = (function(){
        return  window.requestAnimationFrame        ||
                window.webkitRequestAnimationFrame  ||
                window.mozRequesstAnimationFrame    ||
                window.oRequestAnimationFrame       ||
                window.msRequestAnimationFrame      ||
                function(callback){
                    window.setTimeout(callback, 1000 / 60);
                };
    })().bind(window);
    
    function vectors2Line (vectors, material) {
        /** (array of 2 THREE.Vector3[, THREE.LineBasicMaterial]) -> THREE.Line
         *  Create a new line with the given vectors, and optionaly a material.
         *  O(1) time
         */
        material = material !== undefined ? material.clone() : new THREE.LineBasicMaterial({color: 0x0000ff});
        var line = new THREE.Line(new THREE.Geometry(), material);
        line.geometry.vertices = vectors;
        return line;
    }
    
    function vector2Point (vector, material, geometry) {
        /** (THREE.Vector3[, THREE.MeshBasciMateria[, THREE.Geometry]]) -> THREE.Mesh
         *  Creates a point centered at `vector`.
         * O(1) time
         */
        material = material !== undefined ? material.clone() : new THREE.MeshBasicMaterial({color: 0x000000});
        geometry = geometry !== undefined ? geometry : POINT_GEOMETRY;
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position = vector;
        return mesh;
    }
    
    return {
        threeSetup: threeSetup,
        requestAnimationFrame: requestAnimationFrame,
        vectors2Line: vectors2Line,
        vector2Point: vector2Point,
        
        ActivityQueue: ActivityQueue,
        AnimationList: AnimationList,
    };
})();
